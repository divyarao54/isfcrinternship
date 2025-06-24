import React from "react";
import Navbar from "../components/navbar";
import "../styles/home.css";
import centerImage from "../assets/center-image.png";

const home = () => {
    return (
        <div>
            <section className="landing">
                <div className="landing-text">
                    <h1>About ISFCR</h1>
                    <p>
                        Cloud first, mobile first strategy is driving the digital transformation of businesses in India and across the world, impacting their cyber risk profile and posture.
                    </p>
                    <p>
                        The advent of social media, smart phones and tablets has resulted in easy and affordability access to the internet, leading to an increasing ratio of the world's population having a digital presence without an appropriate understanding of their risk exposure to data breaches and hacks. Governments and organisations are facing ever-growing need to protect confidential information collected from the citizens and ensure that the stored information is not stolen or modified by malicious attackers.
                    </p>
                    <p>
                        Technologies such as cloud, big data, analytics, machine learning, artificial intelligence, and the internet of things, promise to open a world of unparalleled growth opportunities along with rise on the risk of confidential data being maliciously collected, stored, and disseminated. Most human resource agencies will confirm the shortage of skilled and qualified cybersecurity professionals, to defend against the ever-morphing security threats. 
                    </p>
                    <p>
                        Thus, there is a clear and immediate need to address this gap in skills and enable our PES students and PES faculty to be at the forefront of Security and IoT technology and equip them with necessary knowledge and skillset.
                    </p>
                    <p>
                        Hence, PES University has fully funded and created the Centre for Information Security, Digital Forensics and Cyber Resilience (C-ISFCR) to squarely address the mentioned issues.
                    </p>
                </div>
            </section>

            <section className="info-section">
                <h2>Contact Us</h2>
                    <p>Email: office.isfcr@pes.edu</p>
                    <p>Phone: +91 98765 43210</p>

                <h2>Location</h2>
                    <p>ISFCR Lab, 11th Floor BE Block, PES University, Bengaluru, Karnataka, India</p>

                <iframe
                    title="Google Maps Location"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d124434.20391264421!2d77.3901337433594!3d12.935407899999996!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae3e46bb096d0b%3A0x8cef6ee2356c0645!2sBE%20Block%20PES%20University!5e0!3m2!1sen!2sin!4v1749539964975!5m2!1sen!2sin"
                    width="50%"
                    height="300"
                    style={{ border: 0, borderRadius: "12px", marginTop: "1rem" }}
                    allowFullScreen=""
                    loading="lazy"
                >    
                </iframe>
            </section>
        </div>
    );
};

export default home;
