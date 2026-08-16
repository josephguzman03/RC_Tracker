# Climbing Tracker

A local-first rock climbing and training tracker for analyzing climbing sessions, cross-training, progression, recovery, injury/load signals, mood, gym difficulty, and projected performance.

The app is designed for personal use and runs its core analytics locally. Optional AI features use a local Ollama model rather than a hosted AI API.

## Features

- Climber profile and radar chart
- Excel session import
- Persistent local browser storage
- Smart merge/replace imports
- Grade progression, weekly volume, and RPE analytics
- Gym sandbag/difficulty calibration
- Injury/load risk indicators
- Mood and session-note analysis
- 30-day learning period before performance predictions
- Evidence-based V-grade progression estimates
- 30/60/90-day projections
- Session archetype classification
- Style/hold nemesis detection
- Local AI Coach through Ollama
- Progress report and PDF export
- Strength-training and cardio tracking
- Cross-training load summaries

## Tech Stack

- React
- Vite
- JavaScript
- CSS
- SheetJS / XLSX
- Ollama

No hosted LLM API is required.

## Requirements

- Node.js / npm
- Ollama for AI features
- A locally installed Ollama model

The project was developed using:

```bash
ollama version 0.6.8
llama3.2:3b
```

Other compatible Ollama versions/models may work but are not guaranteed.

## Setup

Install dependencies:

```bash
npm install
```

Start Ollama:

```bash
ollama serve
```

Make sure the model is available:

```bash
ollama pull llama3.2:3b
ollama list
```

Start the application:

```bash
npm run dev
```

Open the local URL shown by Vite.

## Data Workbook

The included workbook contains three sheets:

- `Sessions` — climbing-session data
- `Cross Training` — strength/cardio data
- `Guide` — field descriptions

### Climbing Session Fields

Typical fields include:

```text
Date
Gym
Grade
Wall Angle
Style
Holds
Attempts
Sent
RPE
Rest Days
Session Type
Injury Flag
Notes
```

Example:

```text
2026-08-16 | Sender One (Santa Ana) | V0 | 30 | vertical | crimp/pinch | 4 | TRUE | 5 | 0 | volume
```

Human-readable values such as `V0`, Excel dates, `TRUE/FALSE`, and slash-separated holds are normalized by the application.

### Cross Training Fields

The `Cross Training` sheet supports:

```text
Date
Type
Focus
Duration
RPE
Finger Load
Notes
```

Examples:

```text
2026-08-17 | strength | pull | 55 | 8 | medium | Weighted pull-ups and rows
2026-08-18 | cardio   | run  | 40 | 5 | none   | Easy Zone 2 run
```

Cross-training load currently uses a simple internal measure:

```text
Load = Duration × RPE
```

This data is treated as training/recovery context. It does **not** directly increase your climbing V-grade ability score.

## Import Modes

**Merge new rows** keeps existing locally stored data and adds new spreadsheet rows that are not already present.

**Replace all** replaces the locally stored dataset with the imported workbook.

For normal use, continue adding rows to the same workbook and periodically use **Merge new rows**.

## Local Data Persistence

Imported climbing and cross-training data are stored in the browser so they survive page navigation, refreshes, and browser restarts.

This is **local browser storage, not a cloud database**.

Important:

- Data is specific to the browser/device where it was imported.
- Clearing browser/site data can delete the locally stored copy.
- Data does not automatically synchronize between a phone and computer.
- Keep the original Excel/Sheets workbook as a backup.
- Private/incognito browsing may not provide reliable long-term persistence.

## Prediction Model

The tracker does not immediately assume it understands a climber.

The prediction system uses an initial **30-day learning period** to establish a baseline before enabling longer-term projections.

A displayed value such as:

```text
V3.6
```

is **not an official climbing grade**.

It represents the tracker’s continuous estimate of progression between established grades. For example, `V3.6` can be interpreted as an established V3 with model evidence of progress toward V4.

Predictions are estimates based only on the data supplied to the application.

Cross-training data may provide recovery/load context, but climbing ability is still determined from climbing evidence.

## Local AI / Ollama

Ollama is used as an interpretation layer for features such as the AI Coach and report summaries.

The deterministic analytics calculate the underlying metrics first. Ollama is then given those results to explain or discuss them.

Ollama is **not intended to be the source of truth for grades, injury status, or performance metrics**.

If Ollama is unavailable, the core analytics should remain usable.

## Important Disclaimers

### Climbing grades

V-grades are subjective and can vary substantially between gyms, setters, regions, climbing styles, and outdoor areas. Gym calibration and progression scores are personal statistical estimates and should not be interpreted as official conversions between grades.

### Predictions

Performance projections are experimental estimates. They do not guarantee that a climber will send a particular grade within a particular time period. Sparse, inconsistent, incorrectly entered, or biased data can significantly affect the results.

### Training load

Strength/cardio load calculations are simplified training estimates for personal analytics. They are not validated sports-science measures and should not be treated as precise physiological load, fatigue, or recovery values.

### Injury and health information

The Injury Tracker, load indicators, recovery signals, AI Coach, and related features are **not medical tools**.

They do not diagnose, prevent, or treat injuries and are not substitutes for evaluation or advice from a physician, physical therapist, athletic trainer, or other qualified healthcare professional.

If you are injured, experiencing persistent pain, or concerned about your health, seek appropriate professional care.

### AI-generated content

Local AI responses may be inaccurate, incomplete, or misleading. Do not rely on AI-generated climbing, training, recovery, or health advice without applying your own judgment.

### Data

Users are responsible for maintaining backups of their climbing and training data. The project makes no guarantee against browser-storage loss, corrupted imports, software bugs, or accidental deletion.

## Project Status

This project should be considered a personal/experimental analytics tool rather than a validated sports-science or medical system.

If you modify or reuse the project, validate the calculations against your own data and training context before relying on its outputs.

## License

No license is included by default. If you plan to publish or distribute this repository, add an appropriate open-source license and verify the licenses of all dependencies you distribute.
