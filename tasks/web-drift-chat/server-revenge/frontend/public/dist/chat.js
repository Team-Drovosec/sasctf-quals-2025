// const API_BASE = "http://localhost:8080/api/";
const API_BASE = "/api/";
let currentChat = null;
let draftTimeout = null;


String.prototype.escapeSpecialChars = function () {
    return this.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}



async function fetchWithErrorHandling(endpoint, options = {}) {
	try {
		const response = await fetch(API_BASE + endpoint, {
			method: options.method || 'GET',
			headers: options.headers || {},
			body: options.body,
			credentials: 'include',
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		return await response.json();
	} catch (error) {
		console.error(`API call failed: ${endpoint}`, error);
		throw error;
	}
}

async function loadChatList() {
	const chatList = document.getElementById('chatList');

	try {
		const data = await fetchWithErrorHandling('chat/list');

		chatList.innerHTML = data.chats.map(chat => `
			<div 
				class="p-3 rounded-lg cursor-pointer ${chat.is_allowed ? 'hover:bg-blue-50' : 'bg-red-50 text-red-500 cursor-not-allowed'}"
				onclick="${chat.is_allowed ? `selectChat('${chat.name.escapeSpecialChars()}')` : ''}"
			>
				${chat.name.escapeSpecialChars()}
				${!chat.is_allowed ? '<span class="text-xs ml-2">(not allowed)</span>' : ''}
			</div>
		`).join('');
	} catch (error) {
		console.error('Failed to load chats:', error);
		chatList.innerHTML = '<div class="text-red-500">Failed to load chats</div>';
	}
}

async function selectChat(chatName) {
	const messagesContainer = document.getElementById('messages');

	try {
		currentChat = chatName;
		document.getElementById('currentChat').textContent = chatName;
		document.getElementById('messageInput').disabled = false;
		document.getElementById('sendButton').disabled = false;

		const { messages, users } = await fetchWithErrorHandling('chat/get', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ chat: chatName })
		});
		loadDrafts(chatName);

		if (messages == null) {
			messagesContainer.innerHTML = "";
			return;
		}

		messagesContainer.innerHTML = messages.map(msg => `
			<div class="flex ${msg.author === 'me' ? 'justify-end' : ''}">
				<div class="max-w-[70%] p-3 rounded-lg ${msg.author === 'me' ? 'bg-blue-500 text-white' : 'bg-white border border-gray-200'}">
					<div class="text-sm font-medium">${msg.author.escapeSpecialChars()}</div>
					<div>${msg.content.escapeSpecialChars()}</div>
				</div>
			</div>
		`).join('');

		const participantsContainer = document.getElementById('chatParticipants');

		participantsContainer.innerHTML = users
			.sort((a, b) => b.online - a.online)
			.map(user => `
			<div class="p-2 bg-gray-50 rounded">
			<div class="font-medium">${user.username.escapeSpecialChars()}</div>
			<div class="text-sm  ${user.online ? `text-green-500` : 'text-gray-500'}" id="draft-${user.username.escapeSpecialChars()}">
				 ${user.online ? `Online` : 'Offline'}
			</div>
			</div>
		`).join('');
	} catch (error) {
		console.error('Failed to load chat:', error);
		messagesContainer.innerHTML = '<div class="text-red-500">Failed to load messages</div>';
	}
}

async function loadDrafts(chatName) {
	const draftStatus = document.getElementById('draftStatus');
	try {
		const { drafts } = await fetchWithErrorHandling('chat/get_drafts', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ chat: chatName })
		});

		draftStatus.innerHTML = Object.entries(drafts)
			.map(([user, draft]) => `<div>${user.escapeSpecialChars()}: ${draft.escapeSpecialChars()}...</div>`)
			.join('');
	} catch (error) {
		console.error('Failed to load drafts:', error);
		draftStatus.innerHTML = '<div class="text-red-500">Failed to load drafts</div>';
	}
}

async function sendMessage() {
	const input = document.getElementById('messageInput');
	const message = input.value.trim();

	if (message) {
		try {
			await setDraft();

			await fetchWithErrorHandling('send_message', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ chat: currentChat, draft: message })
			});

			input.value = '';
			selectChat(currentChat);
		} catch (error) {
			console.error('Failed to send message:', error);
			alert('Failed to send message. Please try again.');
		}
	}
};

async function setDraft() {
	var e = document.getElementById('messageInput');
	try {
		await fetchWithErrorHandling('set_draft', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chat: currentChat,
				draft: e.value
			})
		});
		loadDrafts(currentChat);
	} catch (error) {
		console.error('Failed to save draft:', error);
	}
}

function messageInput() {
	clearTimeout(draftTimeout);
	draftTimeout = setTimeout(setDraft, 500);
};


async function createChat(e) {
	e.preventDefault();

	const chatName = document.getElementById('chatName').value.trim();
	const allowedUsers = document.getElementById('allowedUsers').value
		.split(',')
		.map(u => u.trim())
		.filter(u => u);

	try {
		await fetchWithErrorHandling('chat/create', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: chatName,
				allowed_users: allowedUsers
			})
		});

		document.getElementById('createChatDialog').close();
		document.getElementById('createChatForm').reset();
		await loadChatList();
		selectChat(chatName);
	} catch (error) {
		alert('Failed to create chat: ' + error.message);
	}
};

async function handleLogout() {
	await fetchWithErrorHandling('logout', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({})
	});

	document.cookie.split(";").forEach(cookie => {
		const eqPos = cookie.indexOf("=");
		const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
		document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
	});

	window.location = "/";
}


function check_token() {
	function getCookie(name) {
		let cookie = {};
		document.cookie.split(';').forEach(function (el) {
			let split = el.split('=');
			cookie[split[0].trim()] = split.slice(1).join("=");
		})
		return cookie[name];
	}

	var token = getCookie("token");
	if (token == null) {
		window.location.href = "/";
	}
}


function refreshMessages() {
	check_token();

	if (currentChat) {
		selectChat(currentChat);
	}
}


function init() {
	loadChatList();
	document.getElementById('logoutButton').addEventListener('click', handleLogout);
	document.getElementById('createChatButton').addEventListener('click', () => {
		document.getElementById('createChatDialog').showModal();
	});
	document.getElementById('createChatForm').addEventListener('submit', createChat);
	document.getElementById('messageInput').addEventListener('input', messageInput);
	document.getElementById('sendButton').addEventListener('click', sendMessage);

	document.getElementById('messageInput').addEventListener('keypress', function(e) {
		if (e.key === 'Enter') {
			e.preventDefault();
			sendMessage();
		}
	});

	setInterval(refreshMessages, 3000);
	setInterval(setDraft, 6000);
	setInterval(loadChatList, 10000);
}

window.addEventListener('load', function () {
	init();
})
