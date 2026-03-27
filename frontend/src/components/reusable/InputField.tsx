import { Box, Input } from "@mantine/core";
import { UseFormRegister, FieldValues } from "react-hook-form";
import styles from "../auth/Login/login.module.css";

type InputFieldProps<TFieldValues extends FieldValues> = {
  name: any;
  placeholder: string;
  register: UseFormRegister<TFieldValues>;
  clearErrors: (name: keyof TFieldValues) => void;
  type?: string;
};

const InputField = <TFieldValues extends FieldValues>({
  name,
  placeholder,
  register,
  clearErrors,
  type = "text",
}: InputFieldProps<TFieldValues>) => {
  return (
    <Box className={styles["input-box"]}>
      <Input
        type={type}
        placeholder={placeholder}
        {...register(name)}
        onInput={() => clearErrors(name)}
      />
    </Box>
  );
};

export default InputField;
