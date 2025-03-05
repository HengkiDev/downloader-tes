const express = require('express');
const axios = require('axios');
const { igApi, getCookie } = require('instagram-api-js');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const app = express();
app.use(express.json());

// Konfigurasi Instagram API
const ig = new igApi();

// Middleware untuk menangani kesalahan
const errorHandler = (err, req, res, next) => {
    console.error(err);
    res.status(500).json({ 
        error: 'Terjadi kesalahan', 
        details: err.message 
    });
};
app.use(errorHandler);

// Fungsi untuk mengunduh media
async function downloadMedia(url, type) {
    try {
        // Ambil informasi media dari URL Instagram
        const mediaInfo = await ig.fetchMediaInfo(url);
        
        if (!mediaInfo) {
            throw new Error('Tidak dapat mengambil informasi media');
        }

        // Tentukan URL media berdasarkan tipe
        let mediaUrl;
        if (type === 'post' && mediaInfo.image_versions2) {
            mediaUrl = mediaInfo.image_versions2.candidates[0].url;
        } else if (type === 'video' && mediaInfo.video_versions) {
            mediaUrl = mediaInfo.video_versions[0].url;
        } else {
            throw new Error('Jenis media tidak didukung');
        }

        // Download media
        const response = await axios({
            method: 'get',
            url: mediaUrl,
            responseType: 'stream'
        });

        return response.data;
    } catch (error) {
        console.error('Kesalahan saat mengunduh media:', error);
        throw error;
    }
}

// Endpoint untuk mengunduh postingan
app.post('/download/post', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL postingan diperlukan' });
        }

        // Coba unduh gambar
        try {
            const imageStream = await downloadMedia(url, 'post');
            
            // Buat nama file unik
            const filename = `post_${Date.now()}.jpg`;
            const filepath = path.join(__dirname, 'downloads', filename);
            
            // Simpan file
            const writer = fs.createWriteStream(filepath);
            imageStream.pipe(writer);

            writer.on('finish', () => {
                res.download(filepath, filename, (err) => {
                    // Hapus file setelah dikirim
                    if (!err) {
                        fs.unlinkSync(filepath);
                    }
                });
            });
        } catch (imageError) {
            // Jika gagal download gambar, coba video
            const videoStream = await downloadMedia(url, 'video');
            
            const filename = `video_${Date.now()}.mp4`;
            const filepath = path.join(__dirname, 'downloads', filename);
            
            const writer = fs.createWriteStream(filepath);
            videoStream.pipe(writer);

            writer.on('finish', () => {
                res.download(filepath, filename, (err) => {
                    // Hapus file setelah dikirim
                    if (!err) {
                        fs.unlinkSync(filepath);
                    }
                });
            });
        }
    } catch (error) {
        res.status(500).json({ 
            error: 'Gagal mengunduh media', 
            details: error.message 
        });
    }
});

// Endpoint untuk mengunduh foto profil
app.post('/download/profile', async (req, res) => {
    try {
        const { username } = req.body;
        
        if (!username) {
            return res.status(400).json({ error: 'Username diperlukan' });
        }

        // Dapatkan informasi profil
        const profileInfo = await ig.fetchUserByUsername(username);
        
        if (!profileInfo || !profileInfo.profile_pic_url) {
            return res.status(404).json({ error: 'Profil tidak ditemukan' });
        }

        // Download foto profil
        const response = await axios({
            method: 'get',
            url: profileInfo.profile_pic_url,
            responseType: 'stream'
        });

        // Buat nama file unik
        const filename = `profile_${username}_${Date.now()}.jpg`;
        const filepath = path.join(__dirname, 'downloads', filename);
        
        // Simpan file
        const writer = fs.createWriteStream(filepath);
        response.data.pipe(writer);

        writer.on('finish', () => {
            res.download(filepath, filename, (err) => {
                // Hapus file setelah dikirim
                if (!err) {
                    fs.unlinkSync(filepath);
                }
            });
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Gagal mengunduh foto profil', 
            details: error.message 
        });
    }
});

// Buat direktori downloads jika belum ada
if (!fs.existsSync('./downloads')) {
    fs.mkdirSync('./downloads');
}

// Mulai server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
});

module.exports = app;