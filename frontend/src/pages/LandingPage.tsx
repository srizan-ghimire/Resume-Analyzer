import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-white">
  {/* Navigation Bar */}
  <nav className="bg-white shadow-sm fixed w-full z-10">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between h-16 items-center">
        <div className="flex items-center">
        <img src="/logoblack.png" alt="logo" width="200"/>
          <div className="hidden md:flex ml-10 space-x-8">
            <a href="#" className="text-gray-700 hover:text-black transition-colors">Home</a>
            <a href="#features" className="text-gray-700 hover:text-black transition-colors">Features</a>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <a 
            href="http://127.0.0.1:8000/recruiter/login/?next=/recruiter/" 
            target='_blank'
            className="px-4 py-2 border border-black text-black rounded-lg hover:bg-gray-50 transition-colors"
          >
            Recruiters Dashboard
          </a>
          <Link 
            to="/login" 
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Job Seekers Dashboard
          </Link>
        </div>
      </div>
    </div>
  </nav>

  {/* Hero Section */}
  <div className="pt-32 pb-20 bg-gradient-to-b from-white to-gray-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          Smart Career Matching Powered by AI
        </h1>
        <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
          Revolutionize your hiring process or find your dream job with our intelligent resume screening and job recommendation system.
        </p>
        
        <div className="flex justify-center space-x-4">
          <Link 
            to="/login" 
            className="px-8 py-4 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors text-lg"
          >
            Get Started for Job Seekers
          </Link>
          <a 
            href="http://127.0.0.1:8000/recruiter/login/?next=/recruiter/" 
            target='_blank'
            className="px-8 py-4 border-2 border-black text-black rounded-xl hover:bg-gray-50 transition-colors text-lg"
          >
            Try for Recruiters
          </a>
        </div>
      </div>
    </div>
  </div>

  {/* Features Section */}
  <div className="py-20 bg-white" id='features'>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 className="text-3xl font-bold text-center mb-16 text-gray-900" >Key Features</h2>
      
      <div className="grid md:grid-cols-3 gap-12">
        <div className="p-8 rounded-xl bg-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="w-16 h-16 bg-gray-100 rounded-xl mb-6 flex items-center justify-center">
            <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-4 text-gray-900">Automated Resume Screening</h3>
          <p className="text-gray-600">AI-powered analysis of resumes and job descriptions for instant candidate matching.</p>
        </div>

        <div className="p-8 rounded-xl bg-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="w-16 h-16 bg-gray-100 rounded-xl mb-6 flex items-center justify-center">
            <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-4 text-gray-900">Smart Job Recommendations</h3>
          <p className="text-gray-600">Personalized job suggestions based on your skills, experience, and preferences.</p>
        </div>

        <div className="p-8 rounded-xl bg-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="w-16 h-16 bg-gray-100 rounded-xl mb-6 flex items-center justify-center">
            <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-4 text-gray-900">Real-time Tracking</h3>
          <p className="text-gray-600">Real-time tracking allows continuous monitoring and instant updates of activities or data as they happen, enabling timely decision-making and improved efficiency.</p>
        </div>
      </div>
    </div>
  </div>

  {/* CTA Section */}
  <div className="bg-black text-white py-20">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <h2 className="text-3xl font-bold mb-6">Ready to Transform Your Career Journey?</h2>
      <p className="text-xl mb-8 text-gray-300">Join thousands of users who already found their perfect matches</p>
      <Link 
        to="/register" 
        className="inline-block px-8 py-4 bg-white text-black rounded-xl hover:bg-gray-100 transition-colors text-lg font-semibold"
      >
        Start Now for Free
      </Link>
    </div>
  </div>

  {/* Footer */}
  <footer className="bg-gray-100 py-12">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600">
      <p>© 2023 CareerMatch. All rights reserved.</p>
    </div>
  </footer>
</div>
  );
};

export default LandingPage;