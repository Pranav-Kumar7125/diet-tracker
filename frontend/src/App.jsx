import { useCallback, useEffect, useState } from "react";

// Small fetch wrapper: adds the JWT, parses JSON, and throws an Error with .status on failure.
async function api(path, { token, ...opts } = {}) {
  const res = await fetch("/api" + path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const body = await res.json().catch(() => null); // DELETE returns an empty body
  if (!res.ok) throw Object.assign(new Error(body?.message || "Something went wrong"), { status: res.status });
  return body;
}

function Auth({ onToken }) {
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ username: "", password: "" });
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const { token } = await api(`/auth/${mode}`, { method: "POST", body: JSON.stringify(f) });
      onToken(token);
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <main>
      <section className="label auth">
        <h2>Diet Tracker</h2>
        <div className="thick" />
        <form onSubmit={submit}>
          <input placeholder="Username" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required />
          <input type="password" placeholder="Password (6+ characters)" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
          {err && <p className="error">{err}</p>}
          <button>{mode === "login" ? "Log in" : "Create account"}</button>
        </form>
        <button className="link" onClick={() => { setErr(""); setMode(mode === "login" ? "register" : "login"); }}>
          {mode === "login" ? "New here? Create an account" : "Already registered? Log in"}
        </button>
      </section>
    </main>
  );
}

const EMPTY = { name: "", calories: "", protein: "", carbs: "", fat: "" };

function Dashboard({ token, logout }) {
  const [date, setDate] = useState(() => new Date().toLocaleDateString("en-CA")); // local YYYY-MM-DD
  const [me, setMe] = useState(null);
  const [meals, setMeals] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [err, setErr] = useState("");

  // Every request goes through here: an expired or invalid token logs the user out.
  const call = useCallback(async (path, opts) => {
    try {
      return await api(path, { token, ...opts });
    } catch (e) {
      if (e.status === 401 || e.status === 403) logout();
      else setErr(e.message);
    }
  }, [token, logout]);

  useEffect(() => { call("/me").then((m) => m && setMe(m)); }, [call]);
  useEffect(() => { call(`/meals?date=${date}`).then((m) => m && setMeals(m)); }, [call, date]);

  const add = async (e) => {
    e.preventDefault();
    setErr("");
    const n = (k) => Number(form[k]) || 0;
    const meal = await call("/meals", {
      method: "POST",
      body: JSON.stringify({ name: form.name, calories: n("calories"), protein: n("protein"), carbs: n("carbs"), fat: n("fat"), date }),
    });
    if (meal) { setMeals([...meals, meal]); setForm(EMPTY); }
  };

  const remove = async (id) => {
    await call(`/meals/${id}`, { method: "DELETE" });
    setMeals(meals.filter((m) => m.id !== id));
  };

  const saveGoal = async (value) => {
    const g = Number(value);
    if (g < 500 || g > 10000) return setErr("Goal must be between 500 and 10,000 kcal");
    const updated = await call("/me/goal", { method: "PUT", body: JSON.stringify({ dailyGoal: g }) });
    if (updated) { setMe(updated); setErr(""); }
  };

  const total = (k) => meals.reduce((s, m) => s + m[k], 0);
  const kcal = total("calories");
  const goal = me?.dailyGoal ?? 0;
  const pct = goal ? Math.min(100, Math.round((kcal / goal) * 100)) : 0;
  const over = goal && kcal > goal;

  return (
    <main>
      <header>
        <h1>Hi, {me?.username}</h1>
        <button className="link" onClick={logout}>Log out</button>
      </header>

      <section className="label">
        <h2>Nutrition Facts</h2>
        <div className="spread">
          <input type="date" aria-label="Date" value={date} onChange={(e) => setDate(e.target.value)} />
          <label className="goal">Daily goal (kcal)
            {me && <input key={me.dailyGoal} type="number" defaultValue={me.dailyGoal} onBlur={(e) => saveGoal(e.target.value)} />}
          </label>
        </div>
        <div className="thick" />
        <div className="kcal"><span>Calories</span><span>{kcal}</span></div>
        <div className="bar"><div className={over ? "fill over" : "fill"} style={{ width: pct + "%" }} /></div>
        <p className="mute">{over ? `${kcal - goal} kcal over your goal` : `${goal - kcal} kcal left today`}</p>
        {[["Protein", "protein"], ["Carbs", "carbs"], ["Fat", "fat"]].map(([label, k]) => (
          <div className="line" key={k}><span>{label}</span><b>{total(k)}g</b></div>
        ))}
      </section>

      <form onSubmit={add} className="grid">
        <input className="wide" placeholder="Meal, e.g. Paneer wrap" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        {["calories", "protein", "carbs", "fat"].map((k) => (
          <input key={k} type="number" min="0" placeholder={k === "calories" ? "kcal" : `${k} (g)`} aria-label={k}
            value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} required={k === "calories"} />
        ))}
        <button className="wide">Add meal</button>
      </form>
      {err && <p className="error">{err}</p>}

      <ul>
        {meals.map((m) => (
          <li key={m.id}>
            <span>{m.name}</span>
            <span className="mute">{m.calories} kcal &nbsp;P {m.protein} &nbsp;C {m.carbs} &nbsp;F {m.fat}</span>
            <button className="link" onClick={() => remove(m.id)} aria-label={`Remove ${m.name}`}>Remove</button>
          </li>
        ))}
        {!meals.length && <li className="mute">Nothing logged for this day. Add your first meal above.</li>}
      </ul>
    </main>
  );
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const save = useCallback((t) => {
    if (t) localStorage.setItem("token", t); else localStorage.removeItem("token");
    setToken(t);
  }, []);
  const logout = useCallback(() => save(null), [save]);
  return token ? <Dashboard token={token} logout={logout} /> : <Auth onToken={save} />;
}
