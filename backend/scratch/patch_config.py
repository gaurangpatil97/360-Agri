import json
import os

config_path = r"c:\Users\tanvi\Desktop\gp\360-Agri\models-experm\plant disease detection\plant_disease_model.keras.bak\config.json"

if os.path.exists(config_path):
    with open(config_path, 'r') as f:
        config = json.load(f)
    
    # Recursive function to remove quantization_config
    def remove_quantization(obj):
        if isinstance(obj, dict):
            if 'quantization_config' in obj:
                print(f"Removing quantization_config from {obj.get('name', 'unnamed')}")
                del obj['quantization_config']
            for k, v in obj.items():
                remove_quantization(v)
        elif isinstance(obj, list):
            for item in obj:
                remove_quantization(item)

    remove_quantization(config)
    
    with open(config_path, 'w') as f:
        json.dump(config, f)
    print("Patch complete.")
else:
    print("Config file not found.")
