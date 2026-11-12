'use client';
import {useState} from 'react';
import {ArrowLeft,ArrowRight,CheckCircle2,XCircle,RotateCcw,Play,GraduationCap,Trophy,Lightbulb} from 'lucide-react';

type Question={question:string;options:string[];correct_index:number;explanation:string;video_id:string;timestamp_seconds:number};
type Props={videoIds:string[];busy:boolean;generate:(count:number,difficulty:string,topic:string)=>Promise<{questions:Question[]}>;jump:(videoId:string,seconds:number)=>void};
export default function QuizStudio({videoIds,busy,generate,jump}:Props){
 const [questions,setQuestions]=useState<Question[]>([]);
 const [count,setCount]=useState(5);
 const [difficulty,setDifficulty]=useState('beginner');
 const [topic,setTopic]=useState('');
 const [mode,setMode]=useState<'practice'|'exam'>('practice');
 const [step,setStep]=useState<'setup'|'playing'|'results'>('setup');
 const [index,setIndex]=useState(0);
 const [answers,setAnswers]=useState<Record<number,number>>({});
 const [review,setReview]=useState(false);
 const [hint,setHint]=useState(false);
 const [mistakesOnly,setMistakesOnly]=useState(false);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [sourceQuestions,setSourceQuestions]=useState<Question[]>([]);
 const score=questions.filter((q,i)=>answers[i]===q.correct_index).length;
 const answered=Object.keys(answers).length;
 const current=questions[index];
 const chosen=answers[index];
 const revealed=mode==='practice'&&chosen!==undefined;
 async function start(){setError('');setLoading(true);try{const data=await generate(count,difficulty,topic);if(!data.questions.length)throw Error('No questions returned');setQuestions(data.questions);setSourceQuestions(data.questions);setAnswers({});setIndex(0);setHint(false);setMistakesOnly(false);setStep('playing')}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setLoading(false)}}
 function retry(){const wrong=questions.filter((q,i)=>answers[i]!==q.correct_index);if(!wrong.length){setStep('setup');return;}setQuestions(wrong);setAnswers({});setIndex(0);setHint(false);setMistakesOnly(true);setMode('practice');setStep('playing');setReview(false)}
 function reset(){setQuestions(sourceQuestions);setAnswers({});setIndex(0);setHint(false);setStep('setup');setReview(false)}
 function stamp(s:number){return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`}
 return <div className="quiz-studio">
  <div className="quiz-heading"><div><h2><GraduationCap size={20}/> AI Study Challenge</h2><p className="sub">Practice what you learned, review mistakes, and revisit key video moments.</p></div><span className="quiz-label">Interactive learning</span></div>
  {step==='setup'&&<div className="quiz-setup">
   <div className="quiz-field"><label htmlFor="quiz-topic">Focus topic <span className="sub">(optional)</span></label><input id="quiz-topic" placeholder="e.g. Neural networks, RAG, Python functions" value={topic} onChange={e=>setTopic(e.target.value)}/></div>
   <div className="quiz-controls"><div className="quiz-field"><label htmlFor="quiz-count">Questions</label><select id="quiz-count" value={count} onChange={e=>setCount(Number(e.target.value))}>{[3,5,7,10].map(n=><option key={n} value={n}>{n} questions</option>)}</select></div><div className="quiz-field"><label htmlFor="quiz-difficulty">Difficulty</label><select id="quiz-difficulty" value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div></div>
   <div className="quiz-field"><label>Learning mode</label><div className="quiz-modes"><button type="button" className={mode==='practice'?'selected':''} onClick={()=>setMode('practice')}><strong>Practice</strong><small>Instant feedback after every answer</small></button><button type="button" className={mode==='exam'?'selected':''} onClick={()=>setMode('exam')}><strong>Challenge</strong><small>Reveal answers after finishing</small></button></div></div>
   <button className="quiz-primary" disabled={!videoIds.length||loading||busy} onClick={start}><Play size={17}/>{loading?'Creating questions…':'Generate my quiz'}</button>
   {!videoIds.length&&<p className="sub">Add a YouTube video to your library to unlock the quiz.</p>}
  </div>}
  {step==='playing'&&current&&<div className="quiz-playing">
   <div className="quiz-meta"><span>{mistakesOnly?'Mistake review · ':''}Question {index+1} of {questions.length}</span><span>{answered} answered</span></div>
   <div className="quiz-progress" role="progressbar" aria-valuenow={index+1} aria-valuemin={0} aria-valuemax={questions.length}><div style={{width:`${(index+1)/questions.length*100}%`}}/></div>
   <h3>{current.question}</h3>
   <div className="quiz-options">{current.options.map((option,i)=>{const correct=revealed&&i===current.correct_index;const incorrect=revealed&&i===chosen&&i!==current.correct_index;return <button key={i} type="button" disabled={revealed} className={`${chosen===i?'chosen':''} ${correct?'correct':''} ${incorrect?'incorrect':''}`} onClick={()=>setAnswers(a=>({...a,[index]:i}))}><span className="quiz-letter">{String.fromCharCode(65+i)}</span><span>{option}</span>{correct&&<CheckCircle2 size={19}/ >}{incorrect&&<XCircle size={19}/>}</button>})}</div>
   {revealed&&<div className="quiz-feedback" role="status"><strong>{chosen===current.correct_index?'Great job!':'Keep learning — here is why:'}</strong><p>{current.explanation}</p><button className="quiz-video-link" onClick={()=>jump(current.video_id,current.timestamp_seconds)}><Play size={14}/> Watch explanation at {stamp(current.timestamp_seconds)}</button></div>}
   {!revealed&&<button className="quiz-hint" onClick={()=>setHint(!hint)}><Lightbulb size={15}/>{hint?'Hide study tip':'Need a study tip?'}</button>}
   {hint&&!revealed&&<p className="quiz-tip">Try recalling the relevant concept from the video. You can replay the source segment after answering.</p>}
   <div className="quiz-actions"><button className="secondary" disabled={index===0} onClick={()=>{setIndex(i=>i-1);setHint(false)}}><ArrowLeft size={16}/> Previous</button><button disabled={chosen===undefined} onClick={()=>{setHint(false);if(index===questions.length-1)setStep('results');else setIndex(i=>i+1)}}>{index===questions.length-1?'See my results':'Next question'} <ArrowRight size={16}/></button></div>
  </div>}
  {step==='results'&&<div className="quiz-results"><div className="quiz-score"><Trophy size={34}/><strong>{Math.round(score/questions.length*100)}%</strong><span>{score} out of {questions.length} correct</span><p>{score===questions.length?'Excellent! You mastered this set.':score/questions.length>=0.7?'Nice progress! Review the missed questions to improve.':'Keep practicing. Every attempt builds understanding.'}</p></div>
   <div className="quiz-stats"><div><strong>{score}</strong><span>Correct</span></div><div><strong>{questions.length-score}</strong><span>To review</span></div><div><strong>{questions.length}</strong><span>Total</span></div></div>
   <button className="secondary quiz-wide" onClick={()=>setReview(v=>!v)}>{review?'Hide answer review':'Review all answers'}</button>
   {review&&<div className="quiz-review">{questions.map((q,i)=><div className="quiz-review-item" key={i}><div className="quiz-review-title">{answers[i]===q.correct_index?<CheckCircle2 color="#6ee7b7" size={18}/>:<XCircle color="#fda4af" size={18}/>}<strong>{i+1}. {q.question}</strong></div><p>Your answer: {q.options[answers[i]]||'Not answered'}</p><p>Correct: {q.options[q.correct_index]}</p><p>{q.explanation}</p><button className="quiz-video-link" onClick={()=>jump(q.video_id,q.timestamp_seconds)}><Play size={14}/> Revisit at {stamp(q.timestamp_seconds)}</button></div>)}</div>}
   <div className="quiz-actions"><button className="secondary" onClick={reset}><RotateCcw size={16}/> New quiz</button>{score<questions.length&&<button onClick={retry}>Retry missed questions <ArrowRight size={16}/></button>}</div>
  </div>}
  {error&&<p className="error" role="alert">{error}</p>}
 </div>
}
