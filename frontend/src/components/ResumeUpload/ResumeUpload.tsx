import MyDropzone from "../FileDropZone/MyDropZone";
import styles from "./ResumeUpload.module.css";

const ResumeUpload = () => {
  return (
    <div className={styles["resume-upload-container"]}>
      <h1 className="">AI Resume Analyzer:</h1>
      <h1 className="text-3xl"> Get Your Resume Score Now.</h1>
      <MyDropzone />
    </div>
  );
};

export default ResumeUpload;
