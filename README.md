[![GitHub Super-Linter](https://github.com/Calance-US/public-repository-template/workflows/Lint%20Code%20Base/badge.svg)](https://github.com/marketplace/actions/super-linter)

# 🖋️ Public Repository Template

This repository provides a **CI/CD-enabled vulnerability scanning and notification system**. It integrates **Trivy**, **SonarQube**, and **GitHub Actions** to automate code quality checks, security analysis, and deployment workflows.

A key component of this project is a Python script that processes Trivy scan results and sends email notifications for **HIGH** and **CRITICAL** vulnerabilities.

---

## 🔁 Workflow

The project implements an automated pipeline with the following stages:

1. **Code Quality & Linting** – GitHub Super-Linter runs on pull requests
2. **Security Scanning** – Trivy scans Docker images for vulnerabilities
3. **Quality Analysis** – SonarQube performs static code analysis
4. **Build & Deployment** – Docker image is built and deployed
5. **Notification** – Email alerts sent for critical vulnerabilities

**Workflow Flow:**
Code Push/PR → Linting → Trivy Scan → SonarQube → Build → Deploy → Email Notification

---

## 📄 Documentation

### GitHub Workflows (`.github/workflows/`)

- `build.yml` – Main CI/CD pipeline
- `linter.yml` – Code linting
- `sonar.yml` – SonarQube analysis
- `build-on-ec2.yml` – EC2-based deployment
- `build-on-ecs.yml` – ECS-based deployment
- `stale.yml` – Issue/PR maintenance

### Other Configurations

- `sonar-project.properties` – SonarQube project configuration
- `receivers.txt` – Email recipients list
- `extract_vulnerability.py` – Vulnerability processing script

---

## 👶 Requirements and Dependencies

### Core Requirements

- Python 3.9+
- Docker
- GitHub Actions

### Python Dependencies

- `requests==2.26.0`
- `prettytable`

Install dependencies:

```bash
pip install requests==2.26.0 prettytable
```

---

## ⏳ Installation

Clone the repository:

```bash
git clone https://github.com/<org>/public-repository-template.git
cd public-repository-template
```

### Configure:

- Update `receivers.txt` with valid email addresses
- Update `sonar-project.properties`
- Configure GitHub Secrets

---

## 🌪️ Environment Variables

The following environment variables are required:

```bash
server_address=<SMTP_HOST>
server_port=<SMTP_PORT>
username=<SMTP_USERNAME>
password=<SMTP_PASSWORD>
sender=<SENDER_EMAIL>
repository=<REPO_NAME>
tag=<IMAGE_TAG>
```

---

## 🎉 Running the Project

### Local

Install dependencies:

```bash
pip install requests==2.26.0 prettytable
```

Export environment variables:

```bash
export server_address="smtp.example.com"
export server_port="587"
export username="your-username"
export password="your-password"
export sender="your-email@example.com"
export repository="repo-name"
export tag="latest"
```

Ensure required files exist:

- `trivy-results-json-format.json`
- `receivers.txt`

Run:

```bash
python extract_vulnerability.py
```

---

### Docker

Build image:

```bash
docker build -t vuln-tool .
```

Run container:

```bash
docker run vuln-tool
```

**Dockerfile Location:** `./Dockerfile`
**Context:** Root directory

---

## 💻 Debugging the Code

### Debug tools used

- `pdb` (Python debugger)
- Visual Studio Code / PyCharm

### Debug instructions

Run with debugger:

```bash
python -m pdb extract_vulnerability.py
```

### Common issues

- Missing JSON file → Ensure Trivy output exists
- SMTP failure → Verify credentials and port
- No vulnerabilities → Check scan results

---

## 🔦 Testing

### Vulnerability Testing

```bash
trivy image --format json --output trivy-results-json-format.json <image>
python extract_vulnerability.py
```

### Docker Testing

```bash
docker build -t test-image .
docker run --rm test-image
```

**GitHub Actions Testing:**

- Create a test branch and push changes
- Open a pull request to trigger workflows
- Check workflow execution in Actions tab

**SonarQube Testing:**

- Ensure SonarQube project is configured
- Run analysis locally: `sonar-scanner`
- Verify quality gate status

---

## 🙋 Contributors

To connect with the contributors who worked on this project, please refer to the following:

**Project Manager/s:**

- [Nkashyap-calance](https://github.com/Nkashyap-calance) - Repository Owner & Template Maintainer

**Developer/s:**

- [Calance-US Team](https://github.com/Calance-US) - Development Team
- [Template Contributors](https://github.com/Calance-US/public-repository-template/graphs/contributors) - All contributors to this template

**Template Usage:**
This template is designed to be used across all Calance-US repositories. For questions about implementation or customization, please contact the development team or create an issue in this repository.
