# InsightArxiv - AI-Enhanced Daily arXiv Digest

🌐 **View the Live Digest**: [xmkxabc.github.io/insightarxiv/](https://xmkxabc.github.io/InsightArxiv)

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
git clone https://github.com/xmkxabc/insightarxiv.git
cd insightarxiv
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

## **Latest Bulletin: 2025-08-01**

> [**Read the full report for 2025-08-01...**](./data/2025-08-01.md)

---

### **Past 7 Days**

- [2025-07-31](./data/2025-07-31.md)
- [2025-07-30](./data/2025-07-30.md)
- [2025-07-29](./data/2025-07-29.md)
- [2025-07-28](./data/2025-07-28.md)
- [2025-07-27](./data/2025-07-27.md)
- [2025-07-24](./data/2025-07-24.md)


---

### **Recent Calendar**

#### August 2025

| Mon | Tue | Wed | Thu | Fri | Sat | Sun |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
|   |   |   |   | [1](./data/2025-08-01.md) | 2 | 3 |
| 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| 11 | 12 | 13 | 14 | 15 | 16 | 17 |
| 18 | 19 | 20 | 21 | 22 | 23 | 24 |
| 25 | 26 | 27 | 28 | 29 | 30 | 31 |


#### July 2025

| Mon | Tue | Wed | Thu | Fri | Sat | Sun |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
|   | [1](./data/2025-07-01.md) | [2](./data/2025-07-02.md) | [3](./data/2025-07-03.md) | [4](./data/2025-07-04.md) | [5](./data/2025-07-05.md) | [6](./data/2025-07-06.md) |
| [7](./data/2025-07-07.md) | [8](./data/2025-07-08.md) | [9](./data/2025-07-09.md) | [10](./data/2025-07-10.md) | [11](./data/2025-07-11.md) | 12 | [13](./data/2025-07-13.md) |
| [14](./data/2025-07-14.md) | [15](./data/2025-07-15.md) | [16](./data/2025-07-16.md) | [17](./data/2025-07-17.md) | [18](./data/2025-07-18.md) | 19 | [20](./data/2025-07-20.md) |
| [21](./data/2025-07-21.md) | [22](./data/2025-07-22.md) | [23](./data/2025-07-23.md) | [24](./data/2025-07-24.md) | 25 | 26 | [27](./data/2025-07-27.md) |
| [28](./data/2025-07-28.md) | [29](./data/2025-07-29.md) | [30](./data/2025-07-30.md) | [31](./data/2025-07-31.md) |   |   |   |


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
