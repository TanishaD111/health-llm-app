"use client";
import React, { useState } from "react";
import "./globals.css"; 

export default function SymptomForm() {
  const [symptoms, setSymptoms] = useState({
    fever: "No",
    cough: "No",
    fatigue: "No",
    difficulty_breathing: "No",
  });
  const [gender, setGender] = useState("Female");
  const [diseases, setDiseases] = useState([]);
  const [suggestions, setSuggestions] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleSymptom = (symptom) => {
    setSymptoms((prev) => ({
      ...prev,
      [symptom]: prev[symptom] === "Yes" ? "No" : "Yes",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setDiseases([]);
    setSuggestions("");

    try {
      const res = await fetch("/api/llama", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ symptoms, gender }),
      });

      const data = await res.json();

      if (res.ok) {
        setDiseases(data.diseases || []);
        setSuggestions(data.suggestions || "No suggestions available.");
      } else {
        setError(data.error || "An error occurred.");
      }
    } catch (err) {
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const formatSuggestions = (suggestions) => {
    const groupedSuggestions = {};
    const lines = suggestions.split("\n");

    lines.forEach((line) => {
      if (line.includes(":")) {
        const [disease] = line.split(":");
        groupedSuggestions[disease.trim()] = [];
      } else if (Object.keys(groupedSuggestions).length > 0) {
        const lastDisease = Object.keys(groupedSuggestions).pop();
        groupedSuggestions[lastDisease].push(line.trim());
      }
    });

    return groupedSuggestions;
  };

  return (
    <div>
      <h1>Symptom Checker</h1>
      <form onSubmit={handleSubmit}>
        <h3>Select Symptoms:</h3>
        <div className="symptoms-container">
          {Object.keys(symptoms).map((symptom) => (
            <button
              key={symptom}
              type="button"
              onClick={() => toggleSymptom(symptom)}
              className={`symptom ${symptoms[symptom] === "Yes" ? "active" : ""}`}
            >
              {symptom.replace("_", " ").toUpperCase()}: {symptoms[symptom]}
            </button>
          ))}
        </div>
        <h3>Select Gender:</h3>
        <div className="gender-container">
          {["Female", "Male"].map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(g)}
              className={`gender ${gender === g ? "active" : ""}`}
            >
              {g}
            </button>
          ))}
        </div>
        <br />
        <button type="submit" className="submit">
          {loading ? "Loading..." : "Submit"}
        </button>
      </form>
      {loading && <p className="loading-message">Loading suggestions...</p>}
      {error && <p className="error-message">{error}</p>}
      {diseases.length > 0 && (
        <div className="result-container">
          <h3>Possible Conditions:</h3>
          {diseases.map((disease, index) => (
            <div key={index} className="result-item">
              {disease}
            </div>
          ))}
        </div>
      )}
      {suggestions && (
        <div className="result-container">
          <h3>Suggestions:</h3>
          <table className="suggestions-table">
            
            <tbody>
              {Object.entries(formatSuggestions(suggestions)).map(([disease, suggestions], index) => (
                <React.Fragment key={index}>
                  <tr className="suggestions-title">
                    <td>{disease}</td>
                  </tr>
                  {suggestions.map((suggestion, subIndex) => (
                    <tr key={subIndex} className="suggestions-group">
                      <td>{suggestion}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}