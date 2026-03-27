const Footer = () => {
  return (
    <footer className=' border-t border-neutral-400 pt-10'>
    <div className='flex justify-around'>
      <div>
        <h5 className='text-md font-semibold mb-4'>Resource</h5>
        <ul className='space-y-2'>
          
            <li className='my-2 text-sm text-neutral-400 hover:text-black'>
              <a href="#"target="_blank">Getting Started</a>
            </li>
            <li className='my-2 text-sm text-neutral-400 hover:text-black'>
              <a href="#"target="_blank">Documentation</a>
            </li>
            <li className='my-2 text-sm text-neutral-400 hover:text-black'>
              <a href="#"target="_blank">Tutorials</a>
            </li>
          
        </ul>
      </div>
      <div>
        <h5 className='text-md font-semibold mb-4'>Community</h5>
        <ul className='space-y-2'>
            <li className='my-2 text-sm text-neutral-400 hover:text-black'>
              <a href="#" target="_blank">Features</a>
            </li>
            <li className='my-2 text-sm text-neutral-400 hover:text-black'>
              <a href="#" >Events</a>
            </li>
            <li className='my-2 text-sm text-neutral-400 hover:text-black'>
              <a href="#" target="_blank">About</a>
            </li>
        </ul>
      </div>
  
    </div>
        <div className="container mx-auto text-center mt-10">
          <p className="text-sm">&copy; 2024 ResumeScanner. All rights reserved.</p>
        </div>
  </footer>
  )
}

export default Footer
