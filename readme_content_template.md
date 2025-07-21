# InsightArxiv - AI-Enhanced Daily arXiv Digest

🌐 **View the Live Digest**: [xmkxabc.github.io/insight-arxiv/](https://github.com/xmkxabc/InsightArxiv)

## 🚀 Vision

In an era of information overload, researchers face the daily challenge of navigating a deluge of new papers. **InsightArxiv** is designed to solve this core pain point. It's not just a data scraper; it's a **fully automated, intelligent academic insight engine**.

Our target users are **efficiency-driven AI researchers, engineers, graduate students, and tech decision-makers**. InsightArxiv offers them a revolutionary way to digest and comprehend the latest scientific breakthroughs:

*   **From Reading to Insight**: Deconstructing long, complex papers into multi-dimensional, structured knowledge crystals.
*   **From Filtering to Discernment**: Leveraging AI for in-depth analysis and critical commentary to help users quickly identify the most innovative and relevant research.
*   **From Passive to Proactive**: Allowing users to fully customize their fields of interest, bringing the most valuable information directly to them.

InsightArxiv's unique value proposition lies in combining cutting-edge AI with a deep understanding of the research workflow. We aim to free researchers from the tedious task of literature screening, empowering them to focus on what truly matters: **innovation and critical thinking**.

---

## ✨ Key Features

*   **🤖 End-to-End Automation**: The entire pipeline—from fetching the latest arXiv papers to AI-powered analysis and daily report generation—is fully automated, kicked off with a single `run.sh` command.
*   **🧠 Multi-Dimensional AI Analysis**: Utilizes Google Gemini to deconstruct each paper, generating structured insights including a **TL;DR, Research Motivation, Methodology, Experimental Results, Core Conclusions, Keywords**, and an **exclusive AI-generated commentary**.
*   **🌐 Intelligent Categorization & Navigation**: Automatically categorizes papers by subject and sorts them according to user preferences. The generated report features a **dynamic two-level Table of Contents (TOC)** and seamless internal links for a superior reading experience.
*   **🔄 Resource-Aware Polling**: A smart, built-in mechanism that rotates through multiple models and API keys. When a resource's free quota is exhausted, the system seamlessly switches to the next available one, maximizing cost-efficiency and ensuring high availability.
*   **⚡️ High-Performance & Robust**: Built on `asyncio` for high-concurrency processing, significantly boosting efficiency. The system is designed with robust error handling for network fluctuations, API errors, and data inconsistencies to ensure stable operation.
*   **🎨 Template-Driven & Extensible**: The final report's appearance is driven by a `template.md`, completely separating content from presentation. This allows users to easily customize the report's style. The architecture is clean, modular, and easy to extend.

---

## 🛠️ Tech Stack & Workflow

InsightArxiv operates on a well-architected, modular data processing pipeline:

1.  **[CRAWL] `daily_arxiv/` (Scrapy)**
    *   A sophisticated Scrapy spider that fetches the latest papers from arXiv, configured via the `CATEGORIES` environment variable.
    *   Features intelligent deduplication, filtering of cross-lists, and rich metadata extraction.
    *   **Output**: `data/date.jsonl`

2.  **[ENHANCE] `ai/` (LangChain + Gemini)**
    *   Reads the raw data and processes it with high concurrency using `asyncio`.
    *   Leverages Pydantic models defined in `ai/structure.py` to instruct Gemini to return structured, multi-dimensional analysis.
    *   The core `enhance.py` script manages complex model/key rotation, rate limiting, and retry logic.
    *   **Output**: `data/date_AI_enhanced_lang.jsonl`

3.  **[GENERATE] `to_md/` (Python)**
    *   A powerful report generation engine that consumes the AI-enhanced data.
    *   Renders the structured data into a beautiful, readable Markdown report based on `template.md`.
    *   Intelligently generates a categorized TOC sorted by user preference and convenient in-page navigation.
    *   **Output**: `data/date.md`

4.  **[PUBLISH] `update_readme.py`**
    *   Reads the daily generated Markdown report and dynamically updates the root `README.md` to publish the latest content.

---

## ⚙️ Getting Started

### 1. Prerequisites

Clone this repository to your local machine:
```bash
git clone https://github.com/your-username/insight-arxiv.git
cd insight-arxiv
```
Make sure you have Python 3.10+ installed, along with `uv` (or `pip`) for package management.

### 2. Installation

It is recommended to use `uv` (or `pip`) to install the project dependencies:
```bash
# Using uv (recommended)
uv pip install -r requirements.txt

# Or using pip
pip install -r requirements.txt
```

### 3. Configuration

Create a `.env` file in the project's root directory. This is crucial for the project to run.

```env
# Required: Your Google API Keys, separated by commas. The script will poll them in order.
GOOGLE_API_KEYS=your_google_api_key_1,your_google_api_key_2

# Required: The Gemini models you want to use, in order of priority.
# The system will automatically switch to the next one if a quota is exceeded.
MODEL_PRIORITY_LIST=gemini-1.5-flash,gemini-1.5-pro

# Required: The arXiv categories you want to fetch and prioritize, separated by commas.
# The report will sort categories based on this order.
CATEGORIES=cs.CV,cs.AI,cs.LG,cs.CL,cs.RO,stat.ML
```

### 4. Run!

Execute the `run.sh` script to start the entire automated workflow:

```bash
bash run.sh
```

Once the script finishes, the latest AI-enhanced arXiv report will be automatically updated in this `README.md` file.

---

## 🤝 Contributing

We warmly welcome contributions of all forms! Whether it's reporting a bug, suggesting a new feature, or improving the code through a Pull Request, your help is invaluable to the community.

1.  Found an issue? Please create an [Issue](https://github.com/xmkxabc/InsightArxiv/issues).
2.  Want to add a new feature? Fork the repository and submit a [Pull Request](https://github.com/xmkxabc/daae/pulls).

## 📜 License

This project is open-sourced under the [MIT License](LICENSE).

---

{content}

---
*This page is automatically updated by a GitHub Action.*
