// 🔑 SUPABASE CONFIG (PASTE YOUR REAL VALUES)
const SUPABASE_URL = "https://gqwbptnmdmzeywpmsurn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_WsqlGSeClqzfP00_Kt2EGA_pCuZGzeh";

// ✅ CORRECT INITIALIZATION (THIS IS THE FIX)
const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ---------------- LOGIN ----------------
async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert("Login failed: " + error.message);
    console.error(error);
    return;
  }

  // SUCCESS
  document.getElementById("loginCard").style.display = "none";
  document.getElementById("adminForm").style.display = "block";
}

// ---------------- SAVE QUESTION ----------------
async function saveQuestion() {
  const questionData = {
    category: document.getElementById("category").value,
    question: document.getElementById("question").value,
    options: [
      document.getElementById("opt0").value,
      document.getElementById("opt1").value,
      document.getElementById("opt2").value,
      document.getElementById("opt3").value
    ],
    correct: parseInt(document.getElementById("correct").value),
    explanation: document.getElementById("explanation").value
  };

  const { error } = await supabaseClient
    .from("questions")
    .insert([questionData]);

  if (error) {
    alert("Insert failed: " + error.message);
    console.error(error);
  } else {
    alert("Question saved successfully!");
  }
}
