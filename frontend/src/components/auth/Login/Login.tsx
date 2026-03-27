import { Box } from "@mantine/core";
import styles from "./login.module.css";
import { Link } from "react-router-dom";

import { useForm } from "react-hook-form";
import { useState } from "react";
import EyeIcon from "../../../assets/svgs/EyeIcon";
import EyeCloseIcon from "../../../assets/svgs/EyeCloseIcon";
import { yupResolver } from "@hookform/resolvers/yup";
import { loginSchema } from "./LoginSchema";
import { useAuth } from "../../../context/authContext";

type userType = {
  userName: string;
  password: string;
};

const Login = () => {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const { login } = useAuth();
  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm({ resolver: yupResolver(loginSchema) });

  const onSubmit = (data: userType) => {
    login({
      username: data.userName,
      password: data.password,
    });
  };

  return (
    <Box className={styles["main-wrapper"]}>
      <Box className={styles["wrapper"]}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <h1>Login</h1>
          <Box className={styles["input-box"]}>
            <input
              type="text"
              placeholder="UserName"
              {...register("userName")}
            />
          </Box>
          {errors.userName && (
            <p className="error-message">{errors.userName.message}</p>
          )}
          <Box pos={"relative"}>
            <Box className={styles["input-box"]}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                {...register("password")}
              />
            </Box>
            <Box
              style={{
                cursor: "pointer",
                position: "absolute",
                right: "20px",
                top: "18px",
              }}
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? <EyeIcon /> : <EyeCloseIcon />}
            </Box>
          </Box>
          {errors.password && (
            <p className="error-message">{errors.password.message}</p>
          )}
          <button type="submit" className={styles["btn"]}>
            Login
          </button>
          <Box className={styles["register-link"]}>
            <p>
              Dont have an account? <Link to={"/register"}>Register</Link>
            </p>
          </Box>
        </form>
      </Box>
    </Box>
  );
};

export default Login;
