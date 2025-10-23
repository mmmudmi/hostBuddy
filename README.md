<div align="center">
  <H1><strong>Host Buddy: digital event planner</strong></H1>
  <img src="frontend/public/gifs/logo_black.gif" alt="Logo Black" width="300"/>
  
  <p><strong>Making event planning fun and stress-free! 🎉</strong></p>
  
  [![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://reactjs.org/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
  [![MinIO](https://img.shields.io/badge/MinIO-S3_Compatible-C72E29?style=for-the-badge&logo=minio&logoColor=white)](https://min.io/)
  [![Docker](https://img.shields.io/badge/Docker-20.10-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
</div>

## 🎯 What is it?

Host Buddy is your digital event planning sidekick that turns the chaos of organizing events into something actually enjoyable!

We've packed everything you need into one platform. No more bouncing between spreadsheets, sticky notes, and random apps. Whether you're throwing a backyard BBQ or orchestrating a 500-person conference, Host Buddy keeps all your event details organized while letting you design stunning layouts with our drag-and-drop canvas.

## ✨ Features

### 🗓️ Event Management
- **Create & Manage Events**: Add, edit, delete events
- **All the Details**: Dates, locations, descriptions, photos 
- **Your Dashboard**: See all your events in one place

### 🎨 Layout Designer
- **Drag & Drop Everything**: Move tables, chairs, stages
- **Ready-to-Use Elements**
- **Make Your Own**: Create custom elements and reuse them
- **Select Multiple Things**: Grab a bunch of items and move them all at once
- **Layer Like a Pro**: Send things to the back, bring them forward
- **Style It Up**: Change colors and add borders

### 🔐 Keep It Secure
- **Safe Login**: JWT tokens
- **Your Stuff Stays Yours**: Private accounts

### 📤 Share Your Masterpiece
- **Export as PNG**
- **Export as PDFs**
- **Save Your Work**

## 🎬 See It in Action

### Auto-Numbering
<div align="center">
  <img src="frontend/public/gifs/auto_number.gif" alt="Auto Numbering Demo" width="600"/>
  <p><em>Watch tables get numbered automatically, no longer need to do this manually</em></p>
</div>

### Create Your Own Elements
<div align="center">
  <img src="frontend/public/gifs/my_elements.gif" alt="Custom Elements Demo" width="600"/>
  <p><em>Make custom elements once, use them forever</em></p>
</div>

## 🚀 Get Started

### Use Docker
   ```bash
   # run this from the main folder
   docker-compose up --build
   ```

### You're All Set! 🎉
- **The App**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 🏗️ How It All Works

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │    │   FastAPI API   │    │   PostgreSQL    │
│  (Your Browser) │────│   (The Server)  │────│  (The Database) │
│  • Pretty UI    │    │  • JWT Auth     │    │  • User Data    │
│  • Drag & Drop  │    │  • RESTful APIs │    │  • Events       │
│  • State Magic  │    │  • Data Models  │    │  • Layouts      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                       │
         └────────────────────────┼───────────────────────|
                                  │                        
                         ┌─────────────────┐              
                         │ AWS S3 / MinIO  │              
                         │  (File Storage) │              
                         │ • Your Photos   │              
                         │ • Upload Magic  │              
                         └─────────────────┘              
```


