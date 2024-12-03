import pandas as pd
import sys
import json

#src/python/patient_profile_dataset.csv

def match_symptoms(input_data):
    
    df = pd.read_csv("src/python/patient_profile_dataset.csv")
    
    df = df.drop_duplicates(subset=["Disease", "Fever", "Cough", "Fatigue", "Difficulty Breathing", "Gender"])

    #print("Loaded DataFrame:")
    #print(df)

    filtered = df
    for key, value in input_data.items():
        if key.capitalize() in df.columns and value != "Unknown":
            #print(f"Filtering {key} for value {value}")
            filtered = filtered[filtered[key.capitalize()] == value]

    #print("Filtered DataFrame:")
    #print(filtered)

    if filtered.empty:
        return ["No matching conditions found."]
    
    return filtered["Disease"].unique().tolist()

if __name__ == "__main__":
    input_data = json.loads(sys.argv[1])  
    results = match_symptoms(input_data)
    
    for disease in results:
        print(disease) # will send to llamafile
