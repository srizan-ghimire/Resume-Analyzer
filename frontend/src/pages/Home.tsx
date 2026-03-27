"use client";

import { useQuery } from "@tanstack/react-query";
import JobCard from "../components/JobCard";
import axios from "axios";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function Home() {
  const {
    data: jobListings,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["JobListings"],
    queryFn: async () => {
      const response = await axios.get("http://127.0.0.1:8000/job/");
      return response.data;
    },
  });

  const [currentDate, setCurrentDate] = useState("");
  const [searchTerm, setSearchTerm] = useState(""); // State to hold search query
  const [filteredJobs, setFilteredJobs] = useState(jobListings); // Filtered jobs based on search

  useEffect(() => {
    const date = new Date();
    setCurrentDate(
      date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );
  }, []);

  useEffect(() => {
    // Filter jobs based on searchTerm
    if (searchTerm) {
      setFilteredJobs(
        jobListings.filter((job) =>
          job.job_title.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredJobs(jobListings); // If no search term, show all jobs
    }
  }, [searchTerm, jobListings]); // Re-filter whenever searchTerm or jobListings changes

  return (
    <div className="min-h-screen bg-gray-100 p-4 pb-8">
    {/* Gradient Header Section */}
    <div className="relative bg-gradient-to-r from-gray-100 to-gray-900 text-white px-4 py-8 md:px-8 rounded-xl shadow-2xl text-center mx-auto max-w-7xl">
      {/* Main Heading */}
      <h1 className="text-4xl md:text-5xl font-extrabold mb-4 transform hover:scale-105 transition-transform duration-300">
        Find Your Dream Job
      </h1>
      
      {/* Subheading */}
      <p className="text-lg md:text-xl mb-8 font-medium opacity-90">
        Discover Your Perfect Career Path Among Thousands of Opportunities
      </p>
  
      {/* Search Section */}
      <div className="mt-6 flex flex-col md:flex-row justify-center items-center gap-4 max-w-3xl mx-auto">
        <input
          type="text"
          placeholder="Job title, keywords, or company..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-2/3 px-6 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500 text-gray-800 shadow-lg"
        />
        <button 
          className="w-full md:w-auto px-8 py-4 bg-black hover:bg-gray-800 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
        >
          Search Jobs
        </button>
      </div>
  
      {/* Special CTA Section */}
      <div className="mt-12 p-6 bg-gray-800 backdrop-blur-sm rounded-2xl border border-gray-700 shadow-xl">
        <p className="text-2xl md:text-3xl font-bold mb-4 text-white">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
            Exclusive Opportunities Await
          </span>
        </p>
        <Link
          to="/personalized-jobs"
          className="inline-block px-8 py-3 bg-black hover:bg-gray-800 text-white font-semibold rounded-lg transition-colors duration-300 hover:shadow-md"
        >
          Show Me Matches →
        </Link>
      </div>
    </div>
  
    {/* Job Listings Section */}
    <div className="max-w-7xl mx-auto mt-12">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-800 text-center mb-8">
        {filteredJobs?.length?.toLocaleString() || 0} Opportunities Available
        <span className="block mt-2 text-gray-600 text-lg font-normal">Start your journey today</span>
      </h2>
  
      {/* State Handling */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-white rounded-xl shadow-md p-6">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-12 bg-red-50 rounded-xl">
          <div className="inline-block bg-red-100 p-4 rounded-full mb-4">
            <span className="text-red-500 text-4xl">⚠️</span>
          </div>
          <h3 className="text-xl font-semibold text-red-600 mb-2">
            Oops! Something went wrong
          </h3>
          <p className="text-gray-600">Please try refreshing the page</p>
        </div>
      ) : filteredJobs?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <JobCard 
              key={job.id} 
              job={job}
              className="hover:transform hover:-translate-y-2 transition-all duration-300"
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl shadow-md">
          <div className="inline-block bg-gray-100 p-4 rounded-full mb-4">
            <span className="text-gray-500 text-4xl">💼</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No jobs matching your search
          </h3>
          <p className="text-gray-500">Try adjusting your filters or search terms</p>
        </div>
      )}
    </div>
  </div>
  );
}
