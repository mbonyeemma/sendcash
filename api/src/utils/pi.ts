import axios from 'axios';

const PI_API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.minepi.com'
  : 'https://api.testnet.minepi.com';

const piApi = axios.create({
  baseURL: PI_API_BASE_URL,
  headers: {
    'Authorization': `Key ${process.env.PI_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

export default piApi; 