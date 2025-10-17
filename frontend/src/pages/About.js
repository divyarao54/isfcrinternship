import React from 'react';
import "../styles/about.css";
const About = () => (
  <div style={{ maxWidth: 1000, margin: '40px auto', padding: '24px', background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
    <div className='logo-container' style={{display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%'}}>
      <img src="/ISFCR_logo.png" alt="ISFCR Logo" style={{ width: '45%', height: 'auto', marginBottom: 24 }} />
      <img src="/IOT_Logo.jpg" alt="IOT Logo" style={{ width: '35%', height: 'auto', marginBottom: 24 }} />
    </div>
    <h1 style={{ textAlign: 'center', marginBottom: 32 }}>About ISFCR</h1>
    <div className="about-content" style={{display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 50}}>
      <p>Cloud first, mobile first strategy is driving the digital transformation of businesses in India and across the world, impacting their cyber risk profile and posture.</p>
      <p>The advent of social media, smart phones and tablets has resulted in easy and affordability access to the internet, leading to an increasing ratio of the world’s population having a digital presence without an appropriate understanding of their risk exposure to data breaches and hacks. Governments and organisations are facing ever-growing need to protect confidential information collected from the citizens and ensure that the stored information is not stolen or modified by malicious attackers.</p>
      <p>Technologies such as cloud, big data, analytics, machine learning, artificial intelligence, and the internet of things, promise to open a world of unparalleled growth opportunities along with rise on the risk of confidential data being maliciously collected, stored, and disseminated. Most human resource agencies will confirm the shortage of skilled and qualified cybersecurity professionals, to defend against the ever-morphing security threats.</p>
      <p>Thus, there is a clear and immediate need to address this gap in skills and enable our PES students and PES faculty to be at the forefront of Security and IoT technology and equip them with necessary knowledge and skillset.</p>
      <p>Hence, PES University has fully funded and created the Centre for Information Security, Digital Forensics and Cyber Resilience (C-ISFCR) to squarely address the mentioned issues.</p>
    </div>

  <h2 style={{textAlign: 'center', marginBottom: 16}}>Website Created by:</h2>
    <div className="creator-details" style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', textAlign: 'center', gap: 16}}>
      <div className='creator-card'>
        <div className="creator-img-container">
          <img src="/Divya_Rao_photo.jpeg" style={{width: '100px', height: 'auto'}} alt="Creator 1"/>
        </div>
        <h3>Divya Rao</h3>
        <p>PES1UG22CS194</p>
      </div>
      <div className='creator-card'>
        <div className="creator-img-container">
          <img src="/Roja_Arpith_photo.png" style={{width: '100px', height: 'auto'}} alt="Creator 1"/>
        </div>        <h3>Roja Arpith A V</h3>
        <p>PES1UG22CS484</p>
      </div>
      <div className='creator-card'>
        <div className="creator-img-container">
          <img src="/S_Priyanka_photo.png" style={{width: '100px', height: 'auto'}} alt="Creator 1"/>
        </div>        <h3>S Priyanka</h3>
        <p>PES1UG22CS491</p>
      </div>
      <div className='creator-card'>
        <div className="creator-img-container">
          <img src="/Nihal_Ravi_Ganesh_photo.png" style={{width: '100px', height: 'auto'}} alt="Creator 1"/>
        </div>        <h3>Nihal Ravi Ganesh</h3>
        <p>PES1UG23AM187</p>
      </div>
    </div>
    <h2 style={{textAlign: 'center', marginBottom: 16}}>Under the guidance of:</h2>
    <div className='mentor-card'>
      <img src="/Preet_Kanwal_photo.png" style={{width: '150px', height: 'auto'}} alt="Mentor 1"/>
      <h3>Prof. Preet Kanwal</h3>
    </div>
  </div>
);

export default About; 