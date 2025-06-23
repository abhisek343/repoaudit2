import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

export const getVisualizationsData = async () => {
  const response = await axios.get(`${API_URL}/visualizations`);
  return response.data;
};
