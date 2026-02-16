use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use std::collections::HashMap;
use std::io::{BufReader, Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter};

#[derive(Clone, serde::Serialize)]
pub struct PtyOutput {
    pub agent_id: String,
    pub data: String,
}

#[derive(Clone, serde::Serialize)]
pub struct PtyExit {
    pub agent_id: String,
    pub exit_code: Option<i32>,
}

struct PtySession {
    writer: Box<dyn Write + Send>,
    master: Box<dyn MasterPty + Send>,
    child: Box<dyn portable_pty::Child + Send>,
}

pub struct PtyManager {
    sessions: Arc<Mutex<HashMap<String, PtySession>>>,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn spawn_shell(
        &self,
        agent_id: &str,
        working_dir: &str,
        rows: u16,
        cols: u16,
        app_handle: AppHandle,
    ) -> Result<(), String> {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
        let cmd = CommandBuilder::new_default_prog();
        self.spawn_process(agent_id, cmd, working_dir, rows, cols, app_handle)
    }

    pub fn spawn_agent(
        &self,
        agent_id: &str,
        task: &str,
        working_dir: &str,
        app_handle: AppHandle,
    ) -> Result<(), String> {
        let mut cmd = CommandBuilder::new("claude");
        if !task.is_empty() {
            cmd.arg("--dangerously-skip-permissions");
            cmd.arg("-p");
            cmd.arg(task);
        }
        cmd.cwd(working_dir);
        self.spawn_process(agent_id, cmd, working_dir, 40, 120, app_handle)
    }

    fn spawn_process(
        &self,
        agent_id: &str,
        mut cmd: CommandBuilder,
        working_dir: &str,
        rows: u16,
        cols: u16,
        app_handle: AppHandle,
    ) -> Result<(), String> {
        let pty_system = native_pty_system();

        let pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to open PTY: {}", e))?;

        cmd.cwd(working_dir);

        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Failed to spawn claude: {}", e))?;

        let reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| format!("Failed to clone reader: {}", e))?;

        let writer = pair
            .master
            .take_writer()
            .map_err(|e| format!("Failed to take writer: {}", e))?;

        let id = agent_id.to_string();
        let handle = app_handle.clone();

        thread::spawn(move || {
            let mut buf_reader = BufReader::new(reader);
            let mut buf = [0u8; 4096];
            loop {
                match buf_reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        let data = String::from_utf8_lossy(&buf[..n]).to_string();
                        let _ = handle.emit(
                            "pty-output",
                            PtyOutput {
                                agent_id: id.clone(),
                                data,
                            },
                        );
                    }
                    Err(_) => break,
                }
            }

            let _ = handle.emit(
                "pty-exit",
                PtyExit {
                    agent_id: id.clone(),
                    exit_code: None,
                },
            );
        });

        {
            let mut sessions = self.sessions.lock().map_err(|e| e.to_string())?;
            sessions.insert(
                agent_id.to_string(),
                PtySession {
                    writer,
                    master: pair.master,
                    child,
                },
            );
        }

        Ok(())
    }

    pub fn write_to_agent(&self, agent_id: &str, data: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock().map_err(|e| e.to_string())?;
        if let Some(session) = sessions.get_mut(agent_id) {
            session
                .writer
                .write_all(data.as_bytes())
                .map_err(|e| format!("Failed to write: {}", e))?;
            session
                .writer
                .flush()
                .map_err(|e| format!("Failed to flush: {}", e))?;
            Ok(())
        } else {
            Err(format!("Agent {} not found", agent_id))
        }
    }

    pub fn kill_agent(&self, agent_id: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock().map_err(|e| e.to_string())?;
        if let Some(mut session) = sessions.remove(agent_id) {
            session
                .child
                .kill()
                .map_err(|e| format!("Failed to kill: {}", e))?;
            Ok(())
        } else {
            Err(format!("Agent {} not found", agent_id))
        }
    }

    pub fn resize_agent(&self, agent_id: &str, rows: u16, cols: u16) -> Result<(), String> {
        let sessions = self.sessions.lock().map_err(|e| e.to_string())?;
        if let Some(session) = sessions.get(agent_id) {
            session
                .master
                .resize(PtySize {
                    rows,
                    cols,
                    pixel_width: 0,
                    pixel_height: 0,
                })
                .map_err(|e| format!("Failed to resize: {}", e))?;
            Ok(())
        } else {
            Err(format!("Agent {} not found", agent_id))
        }
    }

    pub fn is_alive(&self, agent_id: &str) -> bool {
        let sessions = self.sessions.lock().unwrap_or_else(|e| e.into_inner());
        sessions.contains_key(agent_id)
    }
}
