import api from './index';

export const draftsAPI = {
  loadDrafts: () => 
    api.get(`/api/drafts/load`),
  
  saveDraft: (content) => 
    api.post(`/api/drafts/save`, { content })
};