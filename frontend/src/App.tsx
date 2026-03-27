import "./App.css";
import { BrowserRouter } from "react-router-dom";

import AuthProvider from "./context/authContext";

import { ToastContainer } from "react-toastify";

import { Layout } from "./Layout";

function App() {
  return (
    <>
      <BrowserRouter>
        <AuthProvider>
          <Layout />
          <ToastContainer autoClose={2000} />
        </AuthProvider>
      </BrowserRouter>
    </>
  );
}

export default App;
