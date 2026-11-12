"use client";
import { useState, useEffect } from 'react';
import QuizStudio from '../components/QuizStudio';
import { BrainCircuit, Video, Sparkles, BookOpen, ArrowUp, Download, Search } from 'lucide-react';
type Citation={video_id:string;timestamp:string;seconds:number;url:string;excerpt:string};
type Msg={role:'user'|'assistant';text:string;citations?:Citation[]};
const API=process.env.NEXT_PUBLIC_API_URL||'http://localhost:8000';
async function request(path:string,body:object,token:string){const r=await fetch(`${API}${path}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(typeof data.detail==='string'?data.detail:'Request failed');return data;}
function Workspace({token,user,logout}:{token:string;user:Account;logout:()=>void}){
 const [url,setUrl]=useState('');const [videos,setVideos]=useState<string[]>([]);const [active,setActive]=useState('');const [time,setTime]=useState(0);const [question,setQuestion]=useState('');const [topic,setTopic]=useState('');const [messages,setMessages]=useState<Msg[]>([{role:'assistant',text:'Welcome to VidMind! Add a YouTube video, then ask me anything about its content.'}]);const [result,setResult]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [session]=useState(()=>crypto.randomUUID());
 async function run(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn()}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
 useEffect(()=>{fetch(`${API}/videos`,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.ok?r.json():[]).then((items:{video_id:string}[])=>{if(Array.isArray(items)){setVideos(items.map(x=>x.video_id));if(items.length)setActive(items[0].video_id)}}).catch(()=>{});},[token]);
 function jump(c:Citation){setActive(c.video_id);setTime(Math.floor(c.seconds));}
 function chips(citations?:Citation[]){return citations?.length?<div className="citations">{citations.slice(0,5).map((c,i)=><button key={i} className="citation" onClick={()=>jump(c)}>▶ {c.video_id.slice(0,5)} · {c.timestamp}</button>)}</div>:null}
 function add(){run(async()=>{const data=await request('/videos',{url},token);setVideos(v=>v.includes(data.video_id)?v:[...v,data.video_id]);setActive(data.video_id);setTime(0);setUrl('');});}
 function ask(){if(!question.trim()||!videos.length)return;const q=question.trim();setQuestion('');setMessages(m=>[...m,{role:'user',text:q}]);run(async()=>{const data=await request('/chat',{question:q,video_ids:videos,session_id:session},token);setMessages(m=>[...m,{role:'assistant',text:data.answer,citations:data.citations}]);});}
 function study(kind:string){if(!videos.length)return;run(async()=>{const data=await request('/study',{video_ids:videos,kind},token);setResult(data.content);});}
 function navigate(){if(!topic.trim()||!videos.length)return;run(async()=>{const data=await request('/navigate',{video_ids:videos,topic},token);setResult(data.citations.length?data.citations.map((c:Citation)=>`${c.video_id} @ ${c.timestamp}\n${c.excerpt}`).join('\n\n'):'No relevant segments found.');if(data.citations[0])jump(data.citations[0]);});}
 function exportNotes(){const blob=new Blob([result],{type:'text/markdown'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='vidmind-notes.md';a.click();URL.revokeObjectURL(a.href);}
 return <main className="shell"><header className="top"><div className="brand"><BrainCircuit size={24} style={{verticalAlign:'middle',marginRight:9,color:'#938aff'}}/>Vid<span>Mind</span> AI</div><div className="account-actions"><span className="account-name">Hi, {user.name}</span><button className="secondary" onClick={logout}>Log out</button></div></header><section className="hero"><h1>Turn any video into <span style={{color:'#a69cff'}}>knowledge.</span></h1><div className="sub">Search moments, chat with videos, compare ideas and generate study materials.</div></section><div className="grid"><section className="panel"><h2><Video size={17} style={{verticalAlign:'middle'}}/> Your video workspace</h2><div className="row"><input aria-label="YouTube URL" placeholder="Paste a YouTube video URL..." value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()}/><button onClick={add} disabled={busy||!url}>Add video</button></div>{active?<iframe key={`${active}-${time}`} className="video" src={`https://www.youtube-nocookie.com/embed/${active}?start=${time}`} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Selected YouTube video"/>:<div className="video" style={{display:'grid',placeItems:'center',color:'#7f91af'}}>Your video will appear here</div>}<p className="sub">Knowledge library · {videos.length} videos</p><div className="tags">{videos.map(v=><button key={v} className="tag" onClick={()=>{setActive(v);setTime(0)}}>{v===active?'● ':''}{v}</button>)}</div><hr style={{borderColor:'#25334d',margin:'20px 0'}}/><h2><Search size={17} style={{verticalAlign:'middle'}}/> Smart Navigator</h2><div className="row"><input placeholder="Find where the speaker explains..." value={topic} onChange={e=>setTopic(e.target.value)} onKeyDown={e=>e.key==='Enter'&&navigate()}/><button onClick={navigate} disabled={busy||!videos.length}>Find</button></div></section><section className="panel"><h2><Sparkles size={17} style={{verticalAlign:'middle',color:'#a99cff'}}/> Ask VidMind</h2><div className="chat">{messages.map((m,i)=><div key={i} className={`bubble ${m.role}`}>{m.text}{chips(m.citations)}</div>)}</div><div className="prompt"><input placeholder="Ask about your video..." value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>e.key==='Enter'&&ask()}/><button aria-label="Send question" onClick={ask} disabled={busy||!videos.length}><ArrowUp size={18}/></button></div></section></div><div className="two"><section className="panel"><h2><BookOpen size={17} style={{verticalAlign:'middle'}}/> Learning Studio</h2><p className="sub">Generate personalized learning resources grounded in your videos.</p><div className="tags"><button className="secondary" onClick={()=>study('notes')} disabled={busy||!videos.length}>📝 Smart notes</button><button className="secondary" onClick={()=>study('flashcards')} disabled={busy||!videos.length}>🗂 Flashcards</button></div></section><section className="panel"><div className="row" style={{justifyContent:'space-between'}}><h2>Generated knowledge</h2><button className="secondary" onClick={exportNotes} disabled={!result}><Download size={15}/> Export</button></div><div className="result">{result||'Your notes, quizzes, flashcards and navigation results will appear here.'}</div></section></div><section className="panel quiz-panel"><QuizStudio videoIds={videos} busy={busy} generate={(count,difficulty,topic)=>request('/quiz',{video_ids:videos,count,difficulty,topic},token)} jump={(id,seconds)=>{setActive(id);setTime(seconds);window.scrollTo({top:0,behavior:'smooth'})}}/></section>{busy&&<p className="sub">Working on your request...</p>}{error&&<p className="error" role="alert">{error}</p>}<footer className="sub" style={{textAlign:'center',marginTop:30}}>VidMind AI · Built with FastAPI, LangGraph, ChromaDB and Next.js</footer></main>;
}


type Account={id:string;name:string;email:string};
type AuthResult={user:Account;access_token:string};
export default function Home(){
 const [token,setToken]=useState('');
 const [user,setUser]=useState<Account|null>(null);
 const [loading,setLoading]=useState(true);
 const [mode,setMode]=useState<'login'|'register'>('login');
 const [name,setName]=useState('');
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [showPassword,setShowPassword]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{
   const saved=window.localStorage.getItem('vidmind_token');
   if(!saved){setLoading(false);return;}
   fetch(`${API}/auth/me`,{headers:{Authorization:`Bearer ${saved}`}})
     .then(async r=>{if(!r.ok)throw Error('Session expired');return r.json()})
     .then((account:Account)=>{setToken(saved);setUser(account)})
     .catch(()=>window.localStorage.removeItem('vidmind_token'))
     .finally(()=>setLoading(false));
 },[]);
 async function submit(e:React.FormEvent<HTMLFormElement>){
   e.preventDefault();setError('');setBusy(true);
   try{
     const r=await fetch(`${API}/auth/${mode}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(mode==='register'?{name,email,password}:{email,password})});
     const data=await r.json();
     if(!r.ok)throw Error(typeof data.detail==='string'?data.detail:'Authentication failed');
     const result=data as AuthResult;
     window.localStorage.setItem('vidmind_token',result.access_token);
     setToken(result.access_token);setUser(result.user);setPassword('');
   }catch(e){setError(e instanceof Error?e.message:'Unable to connect to server')}
   finally{setBusy(false)}
 }
 function logout(){window.localStorage.removeItem('vidmind_token');setToken('');setUser(null);setPassword('');setError('')}
 if(loading)return <div className="auth-page"><div className="auth-card">Loading VidMind AI...</div></div>;
 if(token&&user)return <Workspace key={user.id} token={token} user={user} logout={logout}/>;
 return <main className="auth-page"><div className="auth-card">
   <div className="auth-logo"><BrainCircuit size={30}/> Vid<span>Mind</span> AI</div>
   <div className="auth-eyebrow">YOUR PERSONAL VIDEO LEARNING SPACE</div>
   <h1>{mode==='login'?'Welcome back':'Create your account'}</h1>
   <p className="auth-desc">{mode==='login'?'Sign in to continue exploring, learning, and creating with AI.':'Start learning smarter with videos, quizzes, notes, and AI-powered answers.'}</p>
   <div className="auth-switch" role="group" aria-label="Account access">
     <button type="button" className={mode==='login'?'active':''} onClick={()=>{setMode('login');setError('')}}>Log in</button>
     <button type="button" className={mode==='register'?'active':''} onClick={()=>{setMode('register');setError('')}}>Register</button>
   </div>
   <form onSubmit={submit} className="auth-form">
     {mode==='register'&&<label>Full name<input autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/></label>}
     <label>Email address<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
     <label>Password<div className="password-row"><input type={showPassword?'text':'password'} autoComplete={mode==='register'?'new-password':'current-password'} required minLength={mode==='register'?10:1} value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==='register'?'At least 10 characters':'Enter your password'}/><button type="button" className="password-toggle" onClick={()=>setShowPassword(!showPassword)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?'Hide':'Show'}</button></div></label>
     {mode==='register'&&<p className="auth-hint">Use at least 10 characters. Never reuse a password from another service.</p>}
     {error&&<div className="auth-error" role="alert">{error}</div>}
     <button type="submit" className="auth-submit" disabled={busy}>{busy?'Please wait...':mode==='login'?'Log in to VidMind':'Create account →'}</button>
   </form>
   <p className="auth-footer">{mode==='login'?'New to VidMind?':'Already have an account?'} <button type="button" onClick={()=>{setMode(mode==='login'?'register':'login');setError('')}}>{mode==='login'?'Create an account':'Log in'}</button></p>
 </div><div className="auth-side"><div className="auth-side-inner"><div className="auth-orb">✦</div><h2>Turn videos into<br/><span>understanding.</span></h2><p>Discover the moments that matter. Quiz yourself, compare ideas, and build a knowledge library.</p><div className="auth-features"><span>✦ Smart video search</span><span>✦ AI-powered quizzes</span><span>✦ Notes & flashcards</span></div></div></div></main>;
}
