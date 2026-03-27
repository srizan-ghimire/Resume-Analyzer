import { toast } from "react-toastify";
// import Button from "../../design/Button";
import { useAuth } from "../../context/authContext";
import MyDropZone from "../FileDropZone/MyDropZone";
import { useEffect, useRef, useState } from "react";
// import axios from "axios";
// import { useMutation } from "@tanstack/react-query";
// import ResumeUpload from "../ResumeUpload/ResumeUpload";
const CalculateATS = () => {
  // const { files, username, password } = useAuth();
  // const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  // const [similarityScore, setSimilarityScore] = useState<number | null>(null);
  // const { mutate: calculateATS, isPending } = useMutation({
  //   mutationKey: ["recommendJob"],
  //   mutationFn: async (newData: { job_description: string | undefined }) => {
  //     const response = await axios.post(`http://127.0.0.1:8000/ats/`, newData, {
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: "Basic " + btoa(`${username}:${password}`),
  //       },
  //     });
  //     return response.data;
  //   },
  //   onSuccess: (res: Response) => {
  //     console.log(res);
  //     setSimilarityScore(res.similarity_score);
  //   },
  //   onError: (err: Error) => {
  //     console.log(err);
  //   },
  // });

  // const handleATSCalculation = () => {
  //   if (files.length < 1) {
  //     toast.error("Please Upload Your Resume ");
  //   } else if (
  //     textAreaRef.current &&
  //     textAreaRef.current.value.trim().length < 1
  //   ) {
  //     toast.error("Fill Job Description");
  //   }
  //   calculateATS({
  //     job_description: textAreaRef?.current?.value?.trim(),
  //   });
  // };

  // useEffect(() => {
  //   if (files.length < 1) {
  //     setSimilarityScore(null);
  //   }
  // }, [files]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-12">
      <div className="bg-white shadow-2xl rounded-2xl p-10 w-full max-w-2xl">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-800">
            Upload Your Resume
          </h1>
          <p className="text-gray-500 mt-3 text-md max-w-lg mx-auto">
            Let us help you find the perfect opportunity. Upload your latest
            resume to get personalized job recommendations and apply faster.
          </p>
        </div>

        <MyDropZone />

        {/* Benefits Section */}
        <div className="mt-10 text-gray-700 space-y-4">
          <h2 className="text-xl font-bold">Why Upload Your Resume?</h2>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
            <li>Get matched to jobs that fit your skills and experience.</li>
            <li>
              Save time when applying — no need to fill in everything manually.
            </li>
            <li>Let recruiters find you with one click.</li>
            <li>Track all your applications in one place.</li>
          </ul>
        </div>

        {/* Privacy Note */}
        <p className="text-xs text-gray-400 mt-6 text-center">
          Your information is safe with us. We never share your resume without
          your consent.
        </p>
      </div>
    </div>
  );
};

export default CalculateATS;
