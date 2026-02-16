mod collector;
mod commands;
mod db;
mod detection;
mod pty;

use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let pty_manager = Arc::new(pty::manager::PtyManager::new());
    let loop_detector = Arc::new(detection::loop_detector::LoopDetector::new());
    let database = Arc::new(db::Database::new().expect("Failed to initialize database"));
    let session_watcher = Arc::new(collector::watcher::SessionWatcher::new());

    let watcher_for_setup = session_watcher.clone();

    tauri::Builder::default()
        .manage(pty_manager)
        .manage(loop_detector)
        .manage(database)
        .manage(session_watcher)
        .setup(move |app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Start watching ~/.claude/projects/ for JSONL changes
            let handle = app.handle().clone();
            let watcher = watcher_for_setup.clone();
            std::thread::spawn(move || {
                // Safety: we need a mutable reference to start the watcher.
                // We use unsafe to get around the Arc<SessionWatcher> immutability
                // since start() is only called once at startup.
                let watcher_ptr = Arc::as_ptr(&watcher) as *mut collector::watcher::SessionWatcher;
                unsafe {
                    if let Err(e) = (*watcher_ptr).start(handle) {
                        log::error!("Failed to start session watcher: {}", e);
                    } else {
                        log::info!("Session watcher started");
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::agent::spawn_shell,
            commands::agent::spawn_agent,
            commands::agent::kill_agent,
            commands::agent::write_to_agent,
            commands::agent::resize_agent,
            commands::agent::is_agent_alive,
            commands::agent::register_agent_dir,
            commands::agent::get_home_dir,
            commands::stats::get_recent_sessions,
            commands::stats::get_session_messages,
            commands::stats::get_daily_costs,
            commands::stats::get_model_stats,
            commands::stats::get_total_cost_today,
            commands::stats::save_session,
            commands::stats::import_history,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
