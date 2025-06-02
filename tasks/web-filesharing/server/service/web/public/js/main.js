document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const messageDiv = document.getElementById('registerMessage');
            
            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    messageDiv.textContent = data.message;
                    messageDiv.className = 'message success-message';
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 1000);
                } else {
                    messageDiv.textContent = data.error;
                    messageDiv.className = 'message error-message';
                }
            } catch (error) {
                console.error('Error:', error);
                messageDiv.textContent = 'Registration failed. Please try again.';
                messageDiv.className = 'message error-message';
            }
        });
    }
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const messageDiv = document.getElementById('loginMessage');
            
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    messageDiv.textContent = data.message;
                    messageDiv.className = 'message success-message';
                    setTimeout(() => {
                        window.location.href = '/upload';
                    }, 1000);
                } else {
                    messageDiv.textContent = data.error;
                    messageDiv.className = 'message error-message';
                }
            } catch (error) {
                console.error('Error:', error);
                messageDiv.textContent = 'Login failed. Please try again.';
                messageDiv.className = 'message error-message';
            }
        });
    }

    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const fileInput = document.getElementById('file');
            const file = fileInput.files[0];
            const statusMessage = document.getElementById('uploadMessage');

            if (!file) {
                statusMessage.textContent = 'Please select a file to upload';
                statusMessage.className = 'message error-message';
                return;
            }

            const formData = new FormData(uploadForm);

            try {
                const response = await fetch('%STORAGE_HOST%', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const result = await response.text();
                    if (result.includes('Invalid upload token')) {
                        statusMessage.textContent = 'Upload token has expired. Please refresh the page and try again.';
                    } else if (result.includes('Unsupported Media Type')) {
                        statusMessage.textContent = 'Unsupported file type. Only PNG, JPG and TXT files are supported at the moment.';
                    } else if (result.includes('File Too Large')) {
                        statusMessage.textContent = 'File is too large. Maximum file size is 2MB.';
                    } else {
                        statusMessage.textContent = 'Upload failed';
                    }
                    statusMessage.className = 'message error-message';
                    return
                }

                const result = await response.json();

                try {
                    const save_file = await fetch(`/api/files/${result.uuid}`, {
                        method: 'POST'
                    }); 


                    
                    if (!save_file.success) {
                        statusMessage.innerHTML = `
                            File uploaded successfully,<br>
                            but you have to remember it's UUID: ${result.uuid}. Sorry!<br><br>
                            <a href="%STORAGE_HOST%/${result.uuid}" target="_blank" class="btn btn-primary">View file</a>
                        `;
                        statusMessage.className = 'message success-message';
                        fileInput.value = '';
                    } else {
                        statusMessage.innerHTML = `
                            File uploaded successfully!<br>
                            File ID: ${result.uuid}<br><br>
                            <a href="%STORAGE_HOST%/${result.uuid}" target="_blank" class="btn btn-primary">View file</a>
                        `;
                        statusMessage.className = 'message success-message';
                        fileInput.value = '';
                    }
                } catch (error) {
                    console.error('Error saving UUID:', error);
                }
                
            } catch (error) {
                console.error('Upload error:', error);
                statusMessage.textContent = error.message || 'Failed to upload file';
                statusMessage.className = 'message error-message';
            }
        });
    }
});