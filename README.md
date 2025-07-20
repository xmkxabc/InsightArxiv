# AI-Enhanced Daily arXiv Digest

🌐 **View the Live Digest: [xmkxabc.github.io/daae/](https://xmkxabc.github.io/daae/)**

This project is an automated tool designed to fetch the latest Computer Science papers from arXiv daily, utilize Large Language Models (LLMs) for intelligent analysis, summarization, and translation, and finally generate easy-to-read daily digests and structured data for a live website.

## Table of Contents

- [✨ Core Features](#-core-features)
- [🚀 Workflow Overview](#-workflow-overview)
- [🔧 Usage and Customization](#-usage-and-customization)
  - [Basic Usage](#basic-usage)
  - [Custom Configuration](#custom-configuration)
- [🛠️ Local Development and Execution](#️-local-development-and-execution)
- [📦 Key Dependencies](#-key-dependencies)
- [📂 Project Structure Overview](#-project-structure-overview)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)

## ✨ Core Features

*   **Live Digest Website**: View the AI-enhanced arXiv papers on the live site: **[xmkxabc.github.io/daae/](https://xmkxabc.github.io/daae/)**.
*   **Automated Workflow**: Achieves a complete daily automated process from data fetching to report generation and website deployment via GitHub Actions.
*   **arXiv Paper Fetching**: Uses a Scrapy crawler to obtain metadata of the latest papers from specified arXiv categories.
*   **AI Text Enhancement**:
    *   Leverages the Langchain framework and configurable LLMs (e.g., Google Gemini, DeepSeek) to summarize and translate paper titles and abstracts.
    *   Supports multiple output languages (defaults to Chinese for the Markdown reports).
*   **Diverse Outputs**:
    *   Generates daily Markdown digests (`data/<YYYY-MM-DD>.md`) containing a list of papers and AI-generated summaries.
    *   Dynamically updates the main `README.md` file to display the latest digest, recent reviews, calendar, and historical archives.
    *   Builds a JSON database (`docs/database.json`) containing all processed papers, which powers the [live digest website](https://xmkxabc.github.io/daae/) deployed via GitHub Pages from the `docs` directory.
*   **Highly Configurable**:
    *   Easily configure API keys, target arXiv categories, LLM models, output language, etc., through GitHub Actions Secrets and Variables.
    *   Supports fallback LLM models to improve processing success rates.
*   **Local Execution & Debugging**: Provides a `run.sh` script for convenient testing and execution of the entire processing pipeline in a local environment.
*   **Dependency Management**: Uses `uv` for Python package management, ensuring a consistent environment.

## 🚀 Workflow Overview

1.  **Trigger**:
    *   Automatically triggered daily at a set time (UTC 16:30) via GitHub Actions.
    *   Can be manually triggered from the Actions page.
    *   Also triggered on pushes to the `main` branch (for testing convenience).
2.  **Environment Setup**:
    *   Checks out the code repository.
    *   Installs Python dependencies defined in `pyproject.toml` using `uv sync`.
3.  **Data Processing Pipeline (in `build` job of `.github/workflows/run.yml`):**
    *   **Step 1: Fetch arXiv Papers**:
        *   Navigates to the `daily_arxiv/` directory.
        *   Runs the Scrapy crawler (`scrapy crawl arxiv`), saving raw paper data as `data/<YYYY-MM-DD>.jsonl`.
    *   **Step 2: AI Enhancement Processing**:
        *   Executes the `ai/enhance.py` script, reading the raw JSONL file.
        *   Calls the configured LLM (via environment variables like `GOOGLE_API_KEY`, `MODEL_NAME`, `LANGUAGE`) to summarize and translate papers.
        *   Saves the enhanced data as `data/<YYYY-MM-DD>_AI_enhanced_<LANGUAGE>.jsonl`.
    *   **Step 3: Build JSON Database**:
        *   Runs the `build_database.py` script.
        *   Scans the `data/` directory for all `_AI_enhanced_` files.
        *   Merges all paper data into a single `docs/database.json` file for the static website.
    *   **Step 4: Generate Markdown Digest**:
        *   Executes the `to_md/convert.py` script.
        *   Uses `to_md/paper_template.md` as a template to convert the enhanced JSONL file into the day's Markdown digest (`data/<YYYY-MM-DD>.md`).
    *   **Step 5: Update Main README.md**:
        *   Runs the `update_readme.py` script.
        *   Reads `readme_content_template.md` as the static framework for the README.
        *   Scans all Markdown digests in the `data/` directory to generate dynamic content like "Latest Digest," "Past 7 Days," "Recent Calendar," and "Full Archive."
        *   Populates the template with this dynamic content and overwrites the `README.md` file in the project root.
4.  **(Optional) Create GitHub Issue**:
    *   (Currently commented out in the workflow) Originally planned to use the `peter-evans/create-issue-from-file` Action to create a new GitHub Issue with the daily digest content.
5.  **Code Commit & Push**:
    *   Configures Git user information (via `EMAIL` and `NAME` environment variables).
    *   Adds all newly generated or modified files (digests, database, README) to the staging area.
    *   If changes exist, commits and pushes them to the `main` branch.
6.  **GitHub Pages Deployment (in `deploy` job of `.github/workflows/run.yml`):**
    *   Depends on the successful completion of the `build` job.
    *   Configures GitHub Pages.
    *   Uploads the `docs/` directory (containing `database.json` and any other static site files) as a Pages artifact.
    *   Deploys to GitHub Pages, making the site available at [https://xmkxabc.github.io/daae/](https://xmkxabc.github.io/daae/).

## 🔧 Usage and Customization

### Basic Usage

For users who want to use the default configuration (fetching papers from **cs.CV, cs.GR, cs.CL**, using the **DeepSeek** model, and outputting **Chinese** digests in Markdown, with the website being language-agnostic based on the data):

1.  Fork this repository.
2.  Ensure your GitHub Actions are enabled.
3.  The project will run automatically daily as scheduled.
4.  Check the live digest at [https://[username].github.io/daae/](https://[username].github.io/daae/).
5.  If you like it, please give this project a Star ⭐!

### Custom Configuration

To modify fetch categories, LLMs, language for Markdown reports, etc., follow these steps:

1.  **Fork this repository** to your GitHub account.
2.  Navigate to your repository page, click **Settings** -> **Secrets and variables** -> **Actions**.
3.  **Configure Secrets** (for storing sensitive data):
    *   `GOOGLE_API_KEY`: Your Google AI API key (e.g., for Gemini models).
    *   `SECONDARY_GOOGLE_API_KEY`: (Optional) A backup Google AI API key.
    *   *(If using OpenAI or other services requiring API keys, add corresponding Secrets and modify `ai/enhance.py` accordingly.)*
4.  **Configure Variables** (for storing non-sensitive configuration data):
    *   `CATEGORIES`: arXiv categories to fetch, comma-separated, e.g., `"cs.AI,cs.LG,cs.RO"`.
    *   `LANGUAGE`: Target language for Markdown digests, e.g., `"Chinese"` or `"English"`. (The website will display data as processed).
    *   `MODEL_NAME`: Primary LLM model name (e.g., Google Gemini's `"gemini-pro"` or DeepSeek's `"deepseek-chat"`).
    *   `FALLBACK_MODELS`: (Optional) Comma-separated list of fallback LLM models to try sequentially if the primary model fails.
    *   `EMAIL`: Email address for GitHub commits (e.g., `your_username@users.noreply.github.com`).
    *   `NAME`: Username for GitHub commits (e.g., `your_username`).
5.  **(Optional) Modify GitHub Actions Workflow (`.github/workflows/run.yml`):**
    *   Adjust the `cron` expression in the `schedule` to change the daily run time.
    *   Modify the `ai/enhance.py` script as needed to support different LLM providers or model parameters.
6.  **Test Run**:
    *   Go to your repository page, click **Actions** -> **Daily Arxiv Digest & Deploy Website**.
    *   Click **Run workflow** to trigger a run manually and verify your configuration.

**Important Note on README Modifications**:
*   The sections from "最新速报" (Latest Digest in Chinese) downwards in this README file are automatically generated by the `update_readme.py` script. This script uses `readme_content_template.md` as a base template and populates the `content` placeholder with dynamically generated content.
*   If you need to modify the static English parts of the README (like the project introduction, usage instructions, etc.), you can directly edit the sections in this `README.md` file that precede the dynamically generated Chinese content.
*   Please avoid directly editing the dynamically managed content area, as your changes will be overwritten the next time the script runs.

## 🛠️ Local Development and Execution

You can use the `run.sh` script to simulate the main data processing flow of GitHub Actions in your local environment:

```bash
# Ensure uv is installed and your Python environment is set up
# source .venv/bin/activate (if using a virtual environment)

# Set necessary environment variables (if not handled within the script)
# export LANGUAGE="English" # For Markdown report language
# export GOOGLE_API_KEY="your_api_key"
# ... other environment variables required by ai/enhance.py

bash run.sh
```
This script will sequentially execute:
1. Scrapy crawler (`daily_arxiv/scrapy crawl arxiv`)
2. AI enhancement (`ai/enhance.py`)
3. Markdown conversion (`to_md/convert.py`) (Note: The target filename in `run.sh` for this step might need the `LANGUAGE` variable adjusted based on the actual output of `ai/enhance.py`)
4. README update (`update_readme.py`)

## 📦 Key Dependencies

This project primarily relies on the following Python packages (see `pyproject.toml` for details):

*   `arxiv`: For interacting with the arXiv API.
*   `langchain` & `langchain-google-genai`: For integrating and calling Large Language Models.
*   `scrapy`: For building the arXiv crawler.
*   `python-dotenv`: For managing environment variables (used mainly in `ai/enhance.py`).

Package management is handled by `uv`:
```bash
# Install/sync dependencies
uv sync
```

## 📂 Project Structure Overview

```
.
├── .github/workflows/run.yml  # GitHub Actions workflow definition
├── ai/
│   └── enhance.py             # AI enhancement script (calls LLMs for summary, translation)
├── daily_arxiv/
│   ├── daily_arxiv/
│   │   ├── spiders/
│   │   │   └── arxiv.py       # Scrapy spider: fetches arXiv papers
│   │   └── settings.py        # Scrapy project settings
│   └── scrapy.cfg             # Scrapy project configuration file
├── data/                        # Stores daily raw and AI-enhanced paper data (jsonl, md)
├── docs/                        # Directory for GitHub Pages deployment (contains database.json, index.html, etc.)
├── to_md/
│   ├── convert.py             # Converts AI-enhanced jsonl to Markdown digests
│   └── paper_template.md      # Template for a single paper in Markdown digests
├── .gitignore
├── .python-version              # Specifies Python version (for asdf or pyenv)
├── LICENSE
├── README.md                    # This file
├── build_database.py            # Merges daily AI-enhanced data into docs/database.json
├── pyproject.toml               # Python project configuration (uv/PEP 621)
├── readme_content_template.md   # Base template for dynamic content in README.md
├── run.sh                       # Script for running the main flow locally
├── template.md                  # (Appears to be an old or alternative README template, readme_content_template.md is primarily used)
└── uv.lock                      # uv dependency lock file
```

## 🤝 Contributing

Contributions to this project are welcome! You can participate by:
*   Reporting bugs or suggesting improvements (please open an Issue).
*   Submitting Pull Requests to implement new features or fix problems.
*   Improving documentation.

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=xmkxabc/daae&type=Date)](https://www.star-history.com/#xmkxabc/daae&Date)

# Status
[![arXiv-daily-ai-enhanced](https://github.com/xmkxabc/daily-arXiv-ai-enhanced/actions/workflows/run.yml/badge.svg)](https://github.com/xmkxabc/daily-arXiv-ai-enhanced/actions/workflows/run.yml)

## 📜 License

This project is licensed under the [Apache-2.0 license](./LICENSE).

---

## **最新速报：2025-07-17**

> [**阅读 2025-07-17 的完整报告...**](./data/2025-07-17.md)

---

### **本周回顾 (Past 7 Days)**

- [2025-07-16](./data/2025-07-16.md)
- [2025-07-15](./data/2025-07-15.md)
- [2025-07-14](./data/2025-07-14.md)
- [2025-07-13](./data/2025-07-13.md)
- [2025-07-11](./data/2025-07-11.md)
- [2025-07-10](./data/2025-07-10.md)


---

### 近期日历 (Recent Calendar)

#### July 2025

| 一 (Mon) | 二 (Tue) | 三 (Wed) | 四 (Thu) | 五 (Fri) | 六 (Sat) | 日 (Sun) |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
|   | [1](./data/2025-07-01.md) | [2](./data/2025-07-02.md) | [3](./data/2025-07-03.md) | [4](./data/2025-07-04.md) | [5](./data/2025-07-05.md) | [6](./data/2025-07-06.md) |
| [7](./data/2025-07-07.md) | [8](./data/2025-07-08.md) | [9](./data/2025-07-09.md) | [10](./data/2025-07-10.md) | [11](./data/2025-07-11.md) | 12 | [13](./data/2025-07-13.md) |
| [14](./data/2025-07-14.md) | [15](./data/2025-07-15.md) | [16](./data/2025-07-16.md) | [17](./data/2025-07-17.md) | 18 | 19 | 20 |
| 21 | 22 | 23 | 24 | 25 | 26 | 27 |
| 28 | 29 | 30 | 31 |   |   |   |


---

### **历史存档 (Full Archive)**

<details>
<summary><strong>2025</strong></summary>

<details>
<summary>June</summary>

- [2025-06-30](./data/2025-06-30.md)
- [2025-06-29](./data/2025-06-29.md)
- [2025-06-28](./data/2025-06-28.md)
- [2025-06-27](./data/2025-06-27.md)
- [2025-06-26](./data/2025-06-26.md)
- [2025-06-25](./data/2025-06-25.md)
- [2025-06-24](./data/2025-06-24.md)
- [2025-06-23](./data/2025-06-23.md)
- [2025-06-22](./data/2025-06-22.md)
- [2025-06-21](./data/2025-06-21.md)
- [2025-06-20](./data/2025-06-20.md)
- [2025-06-19](./data/2025-06-19.md)
- [2025-06-18](./data/2025-06-18.md)
- [2025-06-17](./data/2025-06-17.md)
- [2025-06-16](./data/2025-06-16.md)
- [2025-06-15](./data/2025-06-15.md)
- [2025-06-14](./data/2025-06-14.md)
- [2025-06-13](./data/2025-06-13.md)
- [2025-06-12](./data/2025-06-12.md)
- [2025-06-11](./data/2025-06-11.md)
- [2025-06-10](./data/2025-06-10.md)
- [2025-06-09](./data/2025-06-09.md)
- [2025-06-08](./data/2025-06-08.md)
- [2025-06-07](./data/2025-06-07.md)
- [2025-06-06](./data/2025-06-06.md)
- [2025-06-05](./data/2025-06-05.md)
- [2025-06-04](./data/2025-06-04.md)
- [2025-06-03](./data/2025-06-03.md)
- [2025-06-02](./data/2025-06-02.md)
- [2025-06-01](./data/2025-06-01.md)

</details>
<details>
<summary>May</summary>

- [2025-05-31](./data/2025-05-31.md)
- [2025-05-30](./data/2025-05-30.md)
- [2025-05-29](./data/2025-05-29.md)
- [2025-05-28](./data/2025-05-28.md)
- [2025-05-27](./data/2025-05-27.md)
- [2025-05-26](./data/2025-05-26.md)
- [2025-05-25](./data/2025-05-25.md)
- [2025-05-24](./data/2025-05-24.md)
- [2025-05-23](./data/2025-05-23.md)
- [2025-05-22](./data/2025-05-22.md)
- [2025-05-21](./data/2025-05-21.md)
- [2025-05-20](./data/2025-05-20.md)
- [2025-05-19](./data/2025-05-19.md)
- [2025-05-18](./data/2025-05-18.md)
- [2025-05-17](./data/2025-05-17.md)
- [2025-05-16](./data/2025-05-16.md)
- [2025-05-15](./data/2025-05-15.md)
- [2025-05-14](./data/2025-05-14.md)
- [2025-05-13](./data/2025-05-13.md)
- [2025-05-12](./data/2025-05-12.md)
- [2025-05-11](./data/2025-05-11.md)
- [2025-05-10](./data/2025-05-10.md)
- [2025-05-09](./data/2025-05-09.md)
- [2025-05-08](./data/2025-05-08.md)
- [2025-05-07](./data/2025-05-07.md)
- [2025-05-06](./data/2025-05-06.md)
- [2025-05-05](./data/2025-05-05.md)
- [2025-05-04](./data/2025-05-04.md)
- [2025-05-03](./data/2025-05-03.md)
- [2025-05-02](./data/2025-05-02.md)
- [2025-05-01](./data/2025-05-01.md)

</details>
<details>
<summary>April</summary>

- [2025-04-30](./data/2025-04-30.md)
- [2025-04-29](./data/2025-04-29.md)
- [2025-04-28](./data/2025-04-28.md)
- [2025-04-27](./data/2025-04-27.md)
- [2025-04-26](./data/2025-04-26.md)
- [2025-04-25](./data/2025-04-25.md)
- [2025-04-24](./data/2025-04-24.md)
- [2025-04-23](./data/2025-04-23.md)
- [2025-04-22](./data/2025-04-22.md)
- [2025-04-21](./data/2025-04-21.md)
- [2025-04-20](./data/2025-04-20.md)
- [2025-04-19](./data/2025-04-19.md)
- [2025-04-18](./data/2025-04-18.md)
- [2025-04-17](./data/2025-04-17.md)
- [2025-04-16](./data/2025-04-16.md)
- [2025-04-15](./data/2025-04-15.md)
- [2025-04-14](./data/2025-04-14.md)
- [2025-04-13](./data/2025-04-13.md)
- [2025-04-12](./data/2025-04-12.md)
- [2025-04-11](./data/2025-04-11.md)
- [2025-04-10](./data/2025-04-10.md)
- [2025-04-09](./data/2025-04-09.md)
- [2025-04-08](./data/2025-04-08.md)
- [2025-04-07](./data/2025-04-07.md)
- [2025-04-06](./data/2025-04-06.md)
- [2025-04-05](./data/2025-04-05.md)
- [2025-04-04](./data/2025-04-04.md)
- [2025-04-03](./data/2025-04-03.md)
- [2025-04-02](./data/2025-04-02.md)
- [2025-04-01](./data/2025-04-01.md)

</details>
<details>
<summary>March</summary>

- [2025-03-31](./data/2025-03-31.md)
- [2025-03-30](./data/2025-03-30.md)
- [2025-03-29](./data/2025-03-29.md)
- [2025-03-28](./data/2025-03-28.md)
- [2025-03-27](./data/2025-03-27.md)
- [2025-03-26](./data/2025-03-26.md)
- [2025-03-25](./data/2025-03-25.md)
- [2025-03-24](./data/2025-03-24.md)
- [2025-03-23](./data/2025-03-23.md)
- [2025-03-22](./data/2025-03-22.md)
- [2025-03-21](./data/2025-03-21.md)
- [2025-03-20](./data/2025-03-20.md)
- [2025-03-19](./data/2025-03-19.md)
- [2025-03-18](./data/2025-03-18.md)

</details>

</details>


---
*This page is automatically updated by a GitHub Action.*
