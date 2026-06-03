const http = require('http');

const options = {
  hostname: '127.0.0.1',
  port: 8000,
  path: '/api/users/me/profile',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'x-uid': 'test-uid'
  }
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', data));
});

req.write(JSON.stringify({
  display_name: '',
  phone: '',
  state: '',
  district: ''
}));
req.end();
