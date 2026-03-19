# How to Push Your Code to GitHub

## Step 1: Add all files to Git
```bash
git add .
```

## Step 2: Make your first commit
```bash
git commit -m "Initial commit: Token registration website with React frontend"
```

## Step 3: Create a GitHub Repository

### Option A: Using GitHub Website
1. Go to https://github.com
2. Click the "+" icon in the top right corner
3. Select "New repository"
4. Enter a repository name (e.g., "token-registration-website")
5. Choose Public or Private
6. **DO NOT** initialize with README, .gitignore, or license (you already have these)
7. Click "Create repository"

### Option B: Using GitHub CLI (if installed)
```bash
gh repo create token-registration-website --public
```

## Step 4: Add GitHub as Remote
After creating the repository, GitHub will show you commands. Use this one:
```bash
git remote add origin https://github.com/YOUR_USERNAME/token-registration-website.git
```
(Replace `YOUR_USERNAME` with your actual GitHub username)

## Step 5: Push to GitHub
```bash
git branch -M main
git push -u origin main
```

## If you need to set up Git for the first time:
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## For future updates:
After making changes to your code:
```bash
git add .
git commit -m "Description of your changes"
git push
```

