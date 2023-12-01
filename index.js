const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const app = express();
const upload = multer({ dest: 'uploads/' });
require('dotenv').config();

// Serve HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle file upload
app.post('/upload', upload.single('image'), async (req, res) => {
    const file = req.file;
    console.log("file: ", file)
    if (!file) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        const sessionToken = await authenticate();
        console.log("sessionToken: " + sessionToken);
        const uploadResponse = await uploadFileToNAS(sessionToken, file.path, '/Developer_Department/LMI_Files/images', req);
        console.log("uploadResponse: " + JSON.stringify(uploadResponse));
        res.send('File uploaded successfully to NAS.');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error uploading file.');
    }
});


// Authentication with Synology NAS
async function authenticate() {
    try {
        const response = await axios.get(`${process.env.NAS_URL}/webapi/auth.cgi`, {
            params: {
                api: 'SYNO.API.Auth',
                method: 'Login',
                version: 6,
                account: process.env.USERNAME,
                passwd: process.env.PASSWORD,
                session: 'FileStation',
                format: 'cookie'
            }
        });
        console.log("response: ", response.data)
        return response.data.data.sid;
    } catch (error) {
        console.log("error: ", error.message)
    }
}

// Upload file to Synology NAS
async function uploadFileToNAS(sessionToken, filePath, destinationPath, req) {
    const form = new FormData();
    form.append('api', 'SYNO.FileStation.Upload');
    form.append('version', '2');
    form.append('method', 'upload');
    form.append('path', destinationPath);
    form.append('overwrite', 'true');
    // form.append('file', fs.createReadStream(filePath));
    form.append('file', fs.createReadStream(filePath), {
        filename: req.file.originalname,
        contentType: req.file.mimetype
    });

    const response = await axios.post(`${process.env.NAS_URL}/webapi/entry.cgi`, form, {
        headers: {
            ...form.getHeaders(),
            'Cookie': `id=${sessionToken}`
        }
    });
    return response.data;
}

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
