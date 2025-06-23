import axios from 'axios';

const API_URL = '/api';

export const getVisualizationsData = async (repoUrl: string) => {
  const response = await axios.get(`${API_URL}/visualizations`, {
    params: { repoUrl }
  });
  return response.data;
};
