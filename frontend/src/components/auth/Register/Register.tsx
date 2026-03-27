import { Box, Button } from "@mantine/core";
import styles from "./register.module.css";
import { Link } from "react-router-dom";
import { SubmitHandler, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { registrationSchema } from "./RegistrationSchema";
import * as yup from "yup";
import InputField from "../../reusable/InputField";
import EyeIcon from "../../../assets/svgs/EyeIcon";
import { useState } from "react";
import EyeCloseIcon from "../../../assets/svgs/EyeCloseIcon";

import { useAuth } from "../../../context/authContext";

export type UserRegistration = yup.InferType<typeof registrationSchema>;

const Register = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    clearErrors,
  } = useForm<UserRegistration>({
    resolver: yupResolver(registrationSchema),
    mode: "onBlur",
  });

  const { registerUser, isRegisterPending } = useAuth();

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);

  const onSubmit: SubmitHandler<UserRegistration> = (data: any) => {
    console.log(data, "data");
    const updatedUserData = {
      ...data,
      username: data.userName,
      first_name: data.firstName,
      last_name: data.lastName,
    };
    delete updatedUserData.userName;
    delete updatedUserData.firstName;
    delete updatedUserData.lastName;

    registerUser(updatedUserData);
  };

  return (
    <Box className={styles["main-wrapper"]}>
      <Box className={styles["wrapper"]}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <h1>Register</h1>
          <InputField
            type="text"
            name="firstName"
            placeholder="First Name"
            register={register}
            clearErrors={clearErrors}
          />
          {errors.firstName && (
            <p className="error-message">{errors.firstName.message}</p>
          )}

          <Box className={styles["input-box"]}>
            <InputField
              type="text"
              placeholder="Last Name"
              name={"lastName"}
              register={register}
              clearErrors={clearErrors}
            />
          </Box>
          {errors.lastName && (
            <p className="error-message">{errors.lastName.message}</p>
          )}
          <Box className={styles["input-box"]}>
            <InputField
              type="text"
              placeholder="Username"
              name="userName"
              clearErrors={clearErrors}
              register={register}
            />
          </Box>
          {errors.userName && (
            <p className="error-message">{errors.userName.message}</p>
          )}

          <Box pos={"relative"}>
            <Box className={styles["input-box"]}>
              <InputField
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="password"
                register={register}
                clearErrors={clearErrors}
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
          <Box pos={"relative"}>
            <Box className={styles["input-box"]}>
              <InputField
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm Password"
                register={register}
                clearErrors={clearErrors}
              />
            </Box>
            <Box
              style={{
                cursor: "pointer",
                position: "absolute",
                right: "20px",
                top: "18px",
              }}
              onClick={() => setShowConfirmPassword((prev) => !prev)}
            >
              {showConfirmPassword ? <EyeIcon /> : <EyeCloseIcon />}
            </Box>
          </Box>

          {errors.confirmPassword && (
            <p className="error-message">{errors.confirmPassword.message}</p>
          )}

          <button type="submit" className={styles["btn"]}>
            Submit
          </button>
          <Box className={styles["register-link"]}>
            <p>
              Already Have an account? <Link to={"/login"}>Go To Login</Link>
            </p>
          </Box>
        </form>
      </Box>
    </Box>
  );
};

export default Register;
