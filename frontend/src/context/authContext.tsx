import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useContext, createContext, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { UserRegistration } from "../components/auth/Register/Register";
import { toast } from "react-toastify";
import { FileData } from "../components/FileDropZone/MyDropZone";

const notify = () => toast("Registered Successfully!");
const loginError = () => toast("Invalid Credentials");
const loginSuccess = () => toast("Login Success");

interface AuthContextType {
  username: string;
  password: string;
  token: string;
  logOut: () => void;
  login: (loginCredentials: { username: string; password: string }) => void;
  registerUser: (newData: UserRegistration) => void;
  files: FileData[];
  setFiles: React.Dispatch<React.SetStateAction<FileData[]>>;
  fullName: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [username, setUsername] = useState<string>(
    localStorage.getItem("username") || ""
  );
  const [password, setPassword] = useState<string>(
    localStorage.getItem("password") || ""
  );

  const [fullName, setFullName] = useState<string>(
    localStorage.getItem("fullName") || ""
  );
  const [token, setToken] = useState<string>(
    localStorage.getItem("token") || ""
  );
  const [files, setFiles] = useState<FileData[]>([]);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If token exists and user is on login/register, redirect to home
    if (
      token &&
      (location.pathname === "/login" || location.pathname === "/register")
    ) {
      navigate("/");
    }
  }, [token, location.pathname, navigate]);

  const { mutate: registerUser } = useMutation({
    mutationKey: ["register"],
    mutationFn: async (newData: UserRegistration) => {
      const response = await axios.post(
        "http://127.0.0.1:8000/register/",
        newData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      notify();
      navigate("/login");
    },
    onError: (res: unknown) => {
      toast.error(res?.response?.data?.username[0]);
    },
  });

  const { mutate: login } = useMutation({
    mutationKey: ["login"],
    mutationFn: async (loginCredentials: {
      username: string;
      password: string;
    }) => {
      const response = await axios.post(
        "http://127.0.0.1:8000/login/",
        loginCredentials,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    },
    onSuccess: (res, credentials) => {
      setToken(res.token);
      loginSuccess();
      localStorage.setItem("token", res.token);
      setUsername(credentials.username);
      setPassword(credentials.password);
      setFullName(res.fullName);
      localStorage.setItem("username", credentials.username);
      localStorage.setItem("password", credentials.password);
      localStorage.setItem("fullName", res.fullName);
      navigate("/home");
    },
    onError: () => {
      loginError();
    },
  });

  const logOut = () => {
    setToken("");
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("password");
    localStorage.removeItem("fullName");
    navigate("/");
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        username,
        password,
        logOut,
        login,
        registerUser,
        files,
        setFiles,
        fullName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
