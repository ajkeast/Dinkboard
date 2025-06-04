# Dinkboard - Full Stack Web App

A full-stack web application built with React, Express.js, Node.js, and MySQL featuring a modern dashboard interface with data visualization and management capabilities.

## 🚀 Features

- **Modern UI/UX**: Built with Material UI components for a sleek and responsive design
- **Data Visualization**: Interactive charts and graphs using Recharts
- **State Management**: Efficient state handling with Redux Toolkit and RTK Query
- **Data Grid**: Advanced data table functionality with Material UI Data Grid
- **Real-time Updates**: Dynamic data updates and real-time monitoring
- **Authentication**: Secure user authentication and authorization
- **Responsive Design**: Fully responsive layout that works on all devices

## 🛠️ Tech Stack

### Frontend

- React.js
- Material UI
- Material UI Data Grid
- Recharts
- Redux Toolkit
- Redux Toolkit Query
- React Router

### Backend

- Node.js
- Express.js
- MySQL
- JWT Authentication
- RESTful API

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v14 or higher)
- npm (v6 or higher)
- MySQL Server

## 🚀 Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/Dinkboard.git
   cd Dinkboard
   ```

2. **Install Dependencies**

   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

3. **Environment Setup**

   Create a `.env` file in the server directory with the following variables:

   ```
   PORT=5000
   DB_HOST=localhost
   DB_USER=your_mysql_username
   DB_PASSWORD=your_mysql_password
   DB_NAME=your_database_name
   JWT_SECRET=your_jwt_secret
   ```

4. **Database Setup**

   ```sql
   CREATE DATABASE your_database_name;
   USE your_database_name;
   -- Import the provided SQL schema file
   ```

5. **Running the Application**

   ```bash
   # Start the server (from server directory)
   npm start

   # Start the client (from client directory)
   npm start
   ```

   The application will be available at:

   - Frontend: http://localhost:3000/dashboard
   - Backend API: http://localhost:5000

## 📁 Project Structure

```
Dinkboard/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── scenes/        # Page components
│   │   ├── state/         # Redux store and slices
│   │   └── theme.js       # Material UI theme configuration
│   └── public/            # Static files
│
└── server/                # Backend Express application
    ├── controllers/       # Route controllers
    ├── models/           # Database models
    ├── routes/           # API routes
    └── utils/            # Utility functions
```

## 📸 Screenshots

[Add your dashboard screenshots here]

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Contact

For any questions or suggestions, please feel free to reach out:

- GitHub: [[ajkeast]](https://github.com/ajkeast)
- Email: alexander.keast@gmail.com

---

_This project is a work in progress. Feel free to contribute or provide feedback!_
