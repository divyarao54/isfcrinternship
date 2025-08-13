import React from 'react';

const faqs = [
  {
    question: 'What is ISFCR?',
    answer: 'Cloud first, mobile first strategy is driving the digital transformation of businesses in India and across the world, impacting their cyber risk profile and posture. The advent of social media, smart phones and tablets has resulted in easy and affordability access to the internet, leading to an increasing ratio of the world’s population having a digital presence without an appropriate understanding of their risk exposure to data breaches and hacks. Governments and organisations are facing ever-growing need to protect confidential information collected from the citizens and ensure that the stored information is not stolen or modified by malicious attackers. Technologies such as cloud, big data, analytics, machine learning, artificial intelligence, and the internet of things, promise to open a world of unparalleled growth opportunities along with rise on the risk of confidential data being maliciously collected, stored, and disseminated. Most human resource agencies will confirm the shortage of skilled and qualified cybersecurity professionals, to defend against the ever-morphing security threats. Thus, there is a clear and immediate need to address this gap in skills and enable our PES students and PES faculty to be at the forefront of Security and IoT technology and equip them with necessary knowledge and skillset. Hence, PES University has fully funded and created the Centre for Information Security, Digital Forensics and Cyber Resilience (C-ISFCR) to squarely address the mentioned issues.'
  },
  {
    question: 'How do I search for publications?',
    answer: 'Use the search bar at the top left of the navbar. Enter keywords, author names, or publication titles to find relevant papers across all teachers.'
  },
  {
    question: 'How do I view all teachers?',
    answer: 'Click on "Teachers\' Overview" in the navbar to see a list of all faculty members, their photos, and summary metrics.'
  },
  {
    question: 'How do I view a teacher\'s publications and metrics?',
    answer: 'Click on a teacher card in the Teachers\' Overview. You will see their profile, publication list, and citation metrics, including a 3D bar chart and donut chart.'
  },
  {
    question: 'What do the charts on the dashboard show?',
    answer: 'The dashboard features interactive charts: a donut chart for publication type breakdown, a 3D bar chart for teacher metrics, and a yearly community bar chart. Click on chart elements for drilldown details.'
  },
  {
    question: 'How do I add a new publication?',
    answer: 'Click the "+ Add Publication" button on a teacher\'s page. Select the publication type, fill in the form, and submit. For patents, fill in all patent-specific fields.'
  },
  {
    question: 'How do I add a publication for a new teacher?',
    answer: 'In the Add Publication form, select "Other" in the teacher dropdown and enter the new teacher\'s name. The system will create the teacher and add the publication.'
  },
  {
    question: 'What is the "PDF Link" field?',
    answer: 'The PDF Link field allows you to attach a link to the full text of the publication. It is optional but recommended for easy access.'
  },
  {
    question: 'How are patents handled?',
    answer: 'Patents are a special publication type. When adding a patent, fill in inventors, patent office, patent number, and application number. Patents are shown in dashboards and teacher pages.'
  },
  {
    question: 'How do I use the Admin panel?',
    answer: 'Click "Admin" in the navbar. Admins can log in, sign up, reset passwords, and access the admin dashboard to trigger scraping, update all data, and manage teachers.'
  },
  {
    question: 'How does automatic updating work?',
    answer: 'The system automatically scrapes and updates all teacher data every 20 minutes. You can also trigger an update manually from the Admin panel.'
  },
  {
    question: 'What is AI summarization?',
    answer: 'On the publication details page, you can summarize a publication PDF using AI (facebook/bart-large-cnn). Upload a PDF or provide a link, and the system will generate a concise summary.'
  },
  {
    question: 'How do I view publication details?',
    answer: 'Click on any publication title in a teacher\'s list or in search results to see detailed information, including authors, year, type, and summary.'
  },
  {
    question: 'How do I delete a publication?',
    answer: 'On a teacher\'s page, click the trash icon next to a publication to open the delete modal. Confirm to remove the publication.'
  },
  {
    question: 'What if a teacher\'s photo is missing or incorrect?',
    answer: 'Teacher photos are scraped automatically. If a photo is missing, it will be updated on the next sync. Manual DB edits are respected.'
  },
  {
    question: 'How are duplicate publications handled?',
    answer: 'The system deduplicates publications by URL and other metadata. If you see duplicates, check the source data or contact an admin.'
  },
  {
    question: 'How do I reset my admin password?',
    answer: 'Use the "Forgot Password" link on the admin login page. Answer the security questions to reset your password.'
  },
  {
    question: 'What if I encounter an error or bug?',
    answer: 'Check your internet connection and try again. If the problem persists, contact the system administrator or use the feedback option if available.'
  },
  {
    question: 'How do I know if the data is up to date?',
    answer: 'The system syncs every 20 minutes. You can see the last updated time on teacher and citation pages.'
  },
  {
    question: 'What browsers are supported?',
    answer: 'The site works best on modern browsers like Chrome, Firefox, and Edge. For best experience, use the latest version.'
  },
];

const FAQ = () => (
  <div style={{ maxWidth: 800, margin: '40px auto', padding: '24px', background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
    <h1 style={{ textAlign: 'center', marginBottom: 32 }}>Frequently Asked Questions (FAQ)</h1>
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {faqs.map((faq, idx) => (
        <li key={idx} style={{ marginBottom: 28 }}>
          <div style={{ fontWeight: 600, fontSize: 18, color: '#1a237e', marginBottom: 6 }}>{faq.question}</div>
          <div style={{ fontSize: 16, color: '#333', lineHeight: 1.6 }}>{faq.answer}</div>
        </li>
      ))}
    </ul>
  </div>
);

export default FAQ; 