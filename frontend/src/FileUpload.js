import React from 'react'
import { useState } from 'react'
import { Hourglass } from 'react-loader-spinner'

function FileUpload() {
  const [formData, setFormData] = useState({
    inputText: '',
    file: null
  })
  const [isLoaded, setIsLoaded] = useState(false)
  const [message, setMessage] = useState(null)
  const baseUrl = process.env.REACT_APP_API_URL;
  const uploadFileToS3 = async (file, signedUrl) => {
    try {
      setIsLoaded(true);
      const response = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })
      if (!response.ok) {
        setMessage({ success: false, text: 'Failed to upload file to S3' });
        throw new Error('Failed to upload file to S3');
      }
      return true
    } catch (error) {
      setMessage({ success: false, text: 'Error uploading file to S3:' + error.message });

      console.error('Error uploading file to S3:', error);
      return false
    }
  };
  const CreateDynamoDBItem = async (text, filePath) => {
    try {
      setIsLoaded(true);
      setMessage({ success: true, text: 'Inserting item to the DynamoDB...' })
      const response = await fetch(`${baseUrl}?text=${text}&filePath=${filePath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text, filePath })
      });
      if (response.status === 201) {
        setMessage({ success: true, text: 'Item inserted successfully' });
        const responseData = await response.json();
        setIsLoaded(false);
      }
    } catch (error) {
      setIsLoaded(false);
      setMessage({ success: false, text: 'Error inserting item:' + error.message });
      console.error('Error inserting item:', error);
    }
  }

  const handleSubmit = async (e) => {
    try {
      e.preventDefault();

      setMessage({ success: true, text: 'Uploading file...' });
      setIsLoaded(true);
      const signedurl = await fetch(`${baseUrl}?filename=${formData?.file?.name}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
      });
      if (signedurl.status === 200) {
        setIsLoaded(false);
        setMessage({ success: true, text: 'successfully fetched signed url' })
        const responseData = await signedurl.json();
        const { url, filePath } = responseData;
        const response = await uploadFileToS3(formData.file, url);
        if (response) {
          setMessage('File uploaded to S3 successfully');
          CreateDynamoDBItem(formData.inputText, filePath);
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleInputChange = (e) => {
    const { files, name, value } = e.target
    if (files) {
      setFormData({
        ...formData,
        [name]: files[0]
      })
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }
  }
  return (
    <div className='w-2/3 h-2/3'>
      <div className='border m-2 w-full lg:text-xl sm:text-sm py-8 px-2 rounded shadow-xl bg-cyan-300'>
        <div className='font-semibold text-center flex flex-col items-center'>
          <h2>This Web App built using :-</h2>
          <ul className='text-left text-xl'>
            <li className='flex'>1. React </li>
            <li>2. Tailwind Css</li>
            <li>3. Javascript</li>
          </ul>
        </div>
        <form className='flex flex-col gap-4 justify-center items-center p-4' onSubmit={handleSubmit}>
          <div className='flex lg:flex-row sm:flex-col xsm:flex-col gap-2 w-full justify-center'>
            <label className='basis-1/3  font-bold '>Input Text</label>
            <input type="text" className='basis-2/3 p-2 rounded ' required placeholder='enter input text' autoComplete='off' name='inputText' onChange={handleInputChange} />
          </div>
          <div className='flex w-full'>
            <label className='basis-1/3 font-bold'>Input File</label>
            <input type="file" className='basis-2/3' name='file' required onChange={handleInputChange} />
          </div>
          {isLoaded ? <Hourglass /> : <button type='submit' disabled={isLoaded} className='bg-cyan-600 w-24 rounded p-2 text-white hover:bg-cyan-700 shadow-xl' >Submit</button>}
        </form>
        {message !== null && <div className='text-center bg-yellow-200 p-2 m-2 font-bold'><p >{message.text}</p></div>}
      </div>
    </div>
  )
}

export default FileUpload
