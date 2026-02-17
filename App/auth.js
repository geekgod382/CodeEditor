(function() {
"use strict";

const SUPABASE_URL = "https://tyqcfjhuckhhjhrxkctk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5cWNmamh1Y2toaGpocnhrY3RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTc0NjMsImV4cCI6MjA4Njc5MzQ2M30.567HyTbeu8FtpnRSPIZ5N8aD5nvAZuCLGuar2hVrHFA";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ================== DOM Elements ==================
const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authError = document.getElementById('authError');
const authSuccess = document.getElementById('authSuccess');
const switchMode = document.getElementById('switchMode');
const switchText = document.getElementById('switchText');
const closeModal = document.getElementById('closeModal');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authBtns = document.getElementById('authBtns');
const userStatus = document.getElementById('userStatus');
const userEmailEl = document.getElementById('userEmail');

let isLoginMode = true;

// ================== Modal Functions ==================
function openModal() {
    authModal.classList.remove('hidden');
    authError.textContent = '';
    authSuccess.textContent = '';
    authEmail.value = '';
    authPassword.value = '';
    authEmail.focus();
}

function closeModalFn() {
    authModal.classList.add('hidden');
}

function toggleMode() {
    isLoginMode = !isLoginMode;
    if (isLoginMode) {
        authTitle.textContent = 'Login';
        authSubmitBtn.textContent = 'Login';
        switchText.textContent = "Don't have an account?";
        switchMode.textContent = 'Sign up';
    } else {
        authTitle.textContent = 'Sign Up';
        authSubmitBtn.textContent = 'Sign Up';
        switchText.textContent = 'Already have an account?';
        switchMode.textContent = 'Login';
    }
    authError.textContent = '';
    authSuccess.textContent = '';
}

// ================== Auth Functions ==================
async function getUser() {
    const { data: { user } } = await sb.auth.getUser();
    return user;
}

async function handleAuth(e) {
    e.preventDefault();
    const email = authEmail.value.trim();
    const password = authPassword.value;

    authError.textContent = '';
    authSuccess.textContent = '';
    authSubmitBtn.disabled = true;
    authSubmitBtn.textContent = isLoginMode ? 'Logging in...' : 'Signing up...';

    try {
        if (isLoginMode) {
            const { data, error } = await sb.auth.signInWithPassword({ email, password });
            if (error) throw error;
            authSuccess.textContent = 'Login successful!';
            setTimeout(closeModalFn, 1000);
        } else {
            const { data, error } = await sb.auth.signUp({ email, password });
            if (error) throw error;
            
            // Check if email already exists (identities will be empty)
            if (data?.user && data.user.identities?.length === 0) {
                throw new Error('An account with this email already exists. Please login.');
            }
            
            authSuccess.textContent = 'Check your email to confirm your account!';
        }
    } catch (err) {
        authError.textContent = err.message || 'Something went wrong';
    } finally {
        authSubmitBtn.disabled = false;
        authSubmitBtn.textContent = isLoginMode ? 'Login' : 'Sign Up';
    }
}

async function handleLogout() {
    await sb.auth.signOut();
    updateUI(null);
}

// ================== UI State ==================
function updateUI(user) {
    if (user) {
        authBtns.style.display = 'none';
        userStatus.style.display = 'flex';
        userEmailEl.textContent = user.email;
    } else {
        authBtns.style.display = 'flex';
        userStatus.style.display = 'none';
        userEmailEl.textContent = '';
    }
}

// ================== Project CRUD ==================
async function saveProjectToCloud(projectData) {
    const user = await getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await sb
        .from("projects")
        .upsert(
            { ...projectData, user_id: user.id, updated_at: new Date().toISOString() },
            { onConflict: 'user_id,name' }
        )
        .select();
    if (error) throw error;
    return data;
}

async function loadUserProjects() {
    const { data, error } = await sb
        .from("projects")
        .select("*")
        .order("updated_at", { ascending: false });
    if (error) throw error;
    return data;
}

async function deleteProject(id) {
    const { error } = await sb.from("projects").delete().eq('id', id);
    if (error) throw error;
}

// ================== Event Listeners ==================
loginBtn?.addEventListener('click', openModal);
closeModal?.addEventListener('click', closeModalFn);
switchMode?.addEventListener('click', toggleMode);
authForm?.addEventListener('submit', handleAuth);
logoutBtn?.addEventListener('click', handleLogout);

authModal?.addEventListener('click', (e) => {
    if (e.target === authModal) closeModalFn();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !authModal.classList.contains('hidden')) {
        closeModalFn();
    }
});

// ================== Auth State Listener ==================
sb.auth.onAuthStateChange((event, session) => {
    updateUI(session?.user || null);
});

// Initial check
sb.auth.getUser().then(({ data: { user } }) => {
    updateUI(user);
});

// Expose functions globally for script.js
window.cloudAuth = {
    getUser,
    saveProjectToCloud,
    loadUserProjects,
    deleteProject
};

})();
