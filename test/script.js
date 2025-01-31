const API_URL = 'http://localhost:8080';
const MAX_CHUNK_SIZE = 1024 * 1024 * 3; // 3MB

const send = document.getElementById('send');
const image_preview = document.getElementById("image_preview");
const thing = document.getElementById("thing");
const file_input = document.getElementById("file_input");

const video_status = {
    upload: 0
}

const process_file = async (buffer, id) => {

    // send video by chunks (3mb max)
    const chunk = buffer.slice(0 + video_status.upload, video_status.upload + MAX_CHUNK_SIZE);
    const response = await fetch(`${API_URL}/upload/video/process`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/octet-stream',
            'Authorization': get_token(),
            'task-id': id
        },
        body: chunk
    });

    const status = response.status;

    // continue stauts so do another iteration using the same id
    if (status == 201) {
        video_status.upload += MAX_CHUNK_SIZE;
        return process_file(buffer, id);
    }

    // finished upload task
    if (status == 200) {
        video_status.upload = 0;
        return true;
    }

    // erm
    console.log("uh oh: ", response.status, response.statusText);
    video_status.upload = 0;

    return false;
};

thing.addEventListener("click", async (e) => {
    
    e.preventDefault();

    const file = file_input.files[0];

    const buffer = await file.arrayBuffer();    
    const image_extension = file.name.split('.').pop();

    if (!file){
        return;
    }

    const data = {
        title: file.name,
        description: 'test123',
        total_size: file.size,
        format: image_extension
    }

    // creata a new upload task id
    const response = await fetch(`${API_URL}/upload/video`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': get_token()
        },
        body: JSON.stringify(data)
    });

    // get the task id
    const { token: id } = await response.json();

    if (!id) {
        console.log("failed to get task id");
        return;
    }

    const result = await process_file(buffer, id);

    if (!result) {
        console.log("something went wrong", result);
        return;
    }

    alert("finished uploading media");
});

const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/*';

document.body.insertBefore(fileInput, send);

function update_form_title() {
    const form_type = document.getElementById('form_type').value;
    const form_title = document.getElementById('form_title');
    const submit_button = document.getElementById('submit_btn');
    
    form_title.textContent = form_type === 'login' ? 'Login' : 'Register';
    submit_button.textContent = form_type.toLowerCase();
}

function check_login_status() {
    const status = document.getElementById('status');
    const has_token = document.cookie.includes('access_token');
    status.textContent = has_token ? 'logged In' : 'not logged In';
    status.style.color = has_token ? 'green' : 'red';
}

check_login_status();

function handle_login_response(data) {
    
    if (!data?.token) {
        console.log("failed to get token");
        return;
    }

    document.cookie = `access_token=${data.token}`;
    window.location.reload();
}

async function get_info() {

    try {

        // get basic information abou the user
        const response = await fetch(`${API_URL}/user/info`, {
            method: 'GET',
            headers: {
                'Authorization': get_token()
            }
        });

        const data = await response.json();
        image_preview.src = data.user.pfp;
    } catch (error) {
        console.error('Error:', error);
    }
}

get_info();

function clear_token() {
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    window.location.reload();
}

function get_token () {
    const token = document.cookie.split(';').find(cookie => cookie.includes('access_token'));
    return token ? token.split('=')[1] : null;
}

const login_form = document.getElementById('login_form');
login_form.addEventListener('submit', async (e) => {

    e.preventDefault();

    console.log("clicked");

    const form_type = document.getElementById('form_type').value;
    const endpoint = form_type === 'login' ? '/auth/login' : '/auth/create';

    const form_data = {
        username: document.getElementById('username').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    };

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(form_data)
        });
        const data = await response.json();
        handle_login_response(data);
        check_login_status();
    } catch (error) {
        console.error('Error:', error);
    }
});                 

send.addEventListener('click', () => {

    const token = get_token();

    if (!token) {
        alert('Please login first');
        return;
    }

    if (!fileInput.files[0]) {
        alert('Please select an image first');
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    fetch(`${API_URL}/upload/picture`, {
        method: 'POST',
        body: formData,
        headers: {
            "Authorization": `${token}`
        }
    })
    .then(response => response.text())
    .then(data => console.log(data))
    .catch(error => console.error('Error:', error));
});