use super::parser::TokenUsage;

#[derive(Debug, Clone)]
pub struct ModelPricing {
    pub input_per_million: f64,
    pub output_per_million: f64,
    pub cache_read_per_million: f64,
    pub cache_creation_per_million: f64,
}

pub fn get_pricing(model: &str) -> ModelPricing {
    if model.contains("opus") {
        ModelPricing {
            input_per_million: 15.0,
            output_per_million: 75.0,
            cache_read_per_million: 1.5,
            cache_creation_per_million: 18.75,
        }
    } else if model.contains("sonnet") {
        ModelPricing {
            input_per_million: 3.0,
            output_per_million: 15.0,
            cache_read_per_million: 0.3,
            cache_creation_per_million: 3.75,
        }
    } else if model.contains("haiku") {
        ModelPricing {
            input_per_million: 0.25,
            output_per_million: 1.25,
            cache_read_per_million: 0.025,
            cache_creation_per_million: 0.3125,
        }
    } else {
        ModelPricing {
            input_per_million: 3.0,
            output_per_million: 15.0,
            cache_read_per_million: 0.3,
            cache_creation_per_million: 3.75,
        }
    }
}

pub fn calculate_cost(usage: &TokenUsage, model: &str) -> f64 {
    let pricing = get_pricing(model);

    let input_cost = (usage.input_tokens as f64 / 1_000_000.0) * pricing.input_per_million;
    let output_cost = (usage.output_tokens as f64 / 1_000_000.0) * pricing.output_per_million;
    let cache_read_cost =
        (usage.cache_read_input_tokens as f64 / 1_000_000.0) * pricing.cache_read_per_million;
    let cache_create_cost = (usage.cache_creation_input_tokens as f64 / 1_000_000.0)
        * pricing.cache_creation_per_million;

    input_cost + output_cost + cache_read_cost + cache_create_cost
}
