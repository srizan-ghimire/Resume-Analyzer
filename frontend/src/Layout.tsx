import { Routes, Route } from "react-router-dom";
import MainLayout from "./components/Layouts/MainLayout";
import Register from "./components/auth/Register/Register";
import Login from "./components/auth/Login/Login";
import { ProtectedRoute } from "./ProtectedRoute";
import Home from "./pages/Home";
import RecommendJob from "./components/RecommendJob/RecommendJob";
import CalculateATS from "./components/CalculateATS/CalculateATS";
import AppliedJobsPage from "./components/AppliedJobs/AppliedJobs";
import JobDetails from "./components/JobDetails/JobDetails";
import LandingPage from "./pages/LandingPage";

export const Layout = () => {
  return (
    <Routes>
      {/* Routes without MainLayout (Login and Register) */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
        <Route
            path="/"
            element={
                <LandingPage/>
            }
          />

      {/* Routes with MainLayout (Protected routes) */}
      <Route element={<MainLayout />}>
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jobs/:jobId"
          element={
            <ProtectedRoute>
              <JobDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <CalculateATS />
            </ProtectedRoute>
          }
        />
        <Route
          path="/personalized-jobs"
          element={
            <ProtectedRoute>
              <RecommendJob />
            </ProtectedRoute>
          }
        />
        <Route
          path="/applications"
          element={
            <ProtectedRoute>
              <AppliedJobsPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
};
