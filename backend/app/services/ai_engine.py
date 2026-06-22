import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, IsolationForest
import os
import hashlib

class AIEngine:
    def __init__(self):
        self.classifier = None
        self.anomaly_detector = None
        self.is_trained = False
        self._initialize_models()

    def _initialize_models(self):
        # Generate synthetic threat data to train local classifiers
        # Features: payload_size, connections_per_min, failed_logins, is_admin_port, ip_reputation
        np.random.seed(42)
        n_samples = 1000
        
        payload_size = np.random.exponential(scale=1000, size=n_samples)
        connections = np.random.poisson(lam=50, size=n_samples)
        failed_logins = np.random.binomial(n=5, p=0.1, size=n_samples)
        is_admin_port = np.random.binomial(n=1, p=0.05, size=n_samples)
        ip_reputation = np.random.uniform(low=0, high=10, size=n_samples) # 0 (bad) to 10 (clean)
        
        X = np.column_stack([payload_size, connections, failed_logins, is_admin_port, ip_reputation])
        
        y = []
        for i in range(n_samples):
            if failed_logins[i] == 0 and is_admin_port[i] == 0 and ip_reputation[i] > 7 and connections[i] < 80:
                y.append("NORMAL")
            elif connections[i] > 110:
                y.append("DDOS")
            elif failed_logins[i] >= 3:
                y.append("BOTNET")
            elif payload_size[i] > 4000 and ip_reputation[i] < 3:
                y.append("EXFILTRATION")
            else:
                y.append(np.random.choice(["MALWARE", "NORMAL", "PHISHING"]))
                
        # Fit models
        self.classifier = RandomForestClassifier(n_estimators=40, random_state=42)
        self.classifier.fit(X, y)
        
        self.anomaly_detector = IsolationForest(contamination=0.04, random_state=42)
        self.anomaly_detector.fit(X)
        
        self.is_trained = True

    def analyze_event(self, payload_size: float, connections: int, failed_logins: int, is_admin_port: int, ip_reputation: float):
        if not self.is_trained:
            self._initialize_models()
            
        x_new = np.array([[payload_size, connections, failed_logins, is_admin_port, ip_reputation]])
        prediction = self.classifier.predict(x_new)[0]
        anomaly_score = self.anomaly_detector.predict(x_new)[0] # 1 = normal, -1 = anomaly
        
        probs = self.classifier.predict_proba(x_new)[0]
        max_prob = float(np.max(probs))
        
        # Calibrate risk score (0 to 100) based on prediction type & features
        risk_score = 0.0
        if prediction == "DDOS":
            risk_score = 75.0 + min(15.0, (connections / 200.0) * 15.0)
        elif prediction == "BOTNET":
            risk_score = 65.0 + (failed_logins * 5.0)
        elif prediction == "EXFILTRATION":
            risk_score = 80.0 + min(15.0, (payload_size / 8000.0) * 15.0)
        elif prediction == "MALWARE":
            risk_score = 85.0 - (ip_reputation * 3.0)
        elif prediction == "PHISHING":
            risk_score = 50.0 + (max_prob * 30.0)
        else:  # NORMAL
            risk_score = 10.0 + (10.0 - ip_reputation) * 2.0
            
        if anomaly_score == -1:
            risk_score = min(100.0, risk_score + 12.0)
            
        risk_score = max(0.0, min(100.0, float(risk_score)))
        
        if risk_score >= 85:
            severity = "CRITICAL"
        elif risk_score >= 70:
            severity = "HIGH"
        elif risk_score >= 40:
            severity = "MEDIUM"
        else:
            severity = "LOW"
            
        return {
            "classification": prediction,
            "is_anomaly": bool(anomaly_score == -1),
            "risk_score": round(risk_score, 2),
            "severity": severity,
            "confidence": round(max_prob, 2)
        }

    def analyze_ioc(self, ioc_type: str, ioc_value: str):
        # Generate deterministic mock values based on IOC string
        h = int(hashlib.md5(ioc_value.encode()).hexdigest(), 16)
        
        payload_size = float((h % 6000) + 120)
        connections = int((h % 160) + 2)
        failed_logins = int(h % 6)
        is_admin_port = int((h % 12) == 0)
        ip_reputation = float(10.0 - (h % 100) / 10.0)
        
        analysis = self.analyze_event(payload_size, connections, failed_logins, is_admin_port, ip_reputation)
        
        actors = ["APT29 (Cozy Bear)", "APT28 (Fancy Bear)", "Lazarus Group", "LockBit 3.0", "Wizard Spider", "FIN7"]
        malware_families = ["Cobalt Strike Beacon", "RedLine Stealer", "BlackCat Ransomware", "Emotet", "SocGholish", "None"]
        
        actor = actors[h % len(actors)] if analysis["risk_score"] > 60 else "None"
        malware = malware_families[h % len(malware_families)] if analysis["risk_score"] > 50 else "None"
        
        recommendations = [
            "Block host network requests at security boundary firewalls.",
            "Isolate target endpoint via EDR to prevent lateral movement.",
            "Reset credentials for directories and users linked with this token.",
            "Deploy security policy patches to block standard CVE vulnerability execution."
        ]
        
        if analysis["severity"] == "CRITICAL":
            recommendations.insert(0, "Isolate segment, trigger incident response playbook, and alert security leadership.")
        elif analysis["severity"] == "HIGH":
            recommendations.insert(0, "Collect RAM/Disk dumps for static and dynamic binary analysis.")
            
        return {
            "ioc_value": ioc_value,
            "ioc_type": ioc_type,
            "risk_score": analysis["risk_score"],
            "severity": analysis["severity"],
            "classification": analysis["classification"],
            "is_anomaly": analysis["is_anomaly"],
            "threat_actor": actor,
            "malware_family": malware,
            "recommendations": recommendations[:3],
            "confidence": analysis["confidence"]
        }

    def chat_helper(self, prompt: str) -> dict:
        prompt_lower = prompt.lower()
        
        if "cve" in prompt_lower:
            response = (
                "### 🔍 CVE Vulnerability Advisory & Threat Hunting Guidance\n\n"
                "An investigation into current CVE intelligence reveals active exploitation indicators across border servers.\n\n"
                "**Vulnerability Impact:**\n"
                "- **Access Vector**: Network (Remote)\n"
                "- **Complexity**: Low (Easy to script)\n"
                "- **Privileges Required**: None\n"
                "- **Confidentiality / Integrity / Availability**: High / High / Critical\n\n"
                "**Mitigation Steps:**\n"
                "1. **Host Quarantine**: Restrict inbound port 80/443 on exposed nodes.\n"
                "2. **Patch Application**: Apply system patch versions immediately.\n"
                "3. **Signature Blocking**: Enable SNORT rules for payload header matches."
            )
            suggestions = ["How do I mitigate CVE-2024-3094?", "Check log files for exploit attempts.", "Generate block rule for firewalls."]
        elif "ip" in prompt_lower or "abuse" in prompt_lower or "block" in prompt_lower:
            response = (
                "### 🚨 IOC Analysis & C2 Infrastructure Summary\n\n"
                "The requested IP address is associated with active command-and-control (C2) scanning signatures.\n\n"
                "**Analysis Metrics:**\n"
                "- **Attack Signature**: Port scanning & credential stuffing\n"
                "- **Threat Category**: Botnet Node (Mirai variant)\n"
                "- **IP Integrity Level**: 12% (Highly malicious reputation)\n\n"
                "**Active Containment Guidance:**\n"
                "- Inject block-lists inside Palo Alto/Cisco firewalls.\n"
                "- Query active endpoints running sockets connected to this remote port.\n"
                "- Flag associated email login sessions from this geolocation."
            )
            suggestions = ["Analyze IP 185.220.101.5", "Show botnet attack maps.", "What is the reputation score?"]
        elif "incident" in prompt_lower or "remediate" in prompt_lower or "respond" in prompt_lower:
            response = (
                "### 🛡️ Incident Response Playbook: Malware Containment\n\n"
                "To resolve active malware alerts, trigger the standard SOC incident timeline:\n\n"
                "1. **Isolate Affected Node**: Terminate network connection of compromised server.\n"
                "2. **Harvest Artifacts**: Pull running memory logs and file change history.\n"
                "3. **Revoke Active Tokens**: Delete associated user JWTs and reset Active Directory session keys.\n"
                "4. **Rebuild & Verify**: Clean affected files, patch OS vulnerability, and restore system state from backup."
            )
            suggestions = ["Draft incident report.", "Extract file metadata.", "Create a threat containment ticket."]
        else:
            response = (
                "🤖 **SOC AI Cyber Assistant Online**\n\n"
                "I am your virtual security analyst. Ask me questions like:\n\n"
                "- *'How do I respond to Ransomware?'*\n"
                "- *'Explain vulnerability CVE-2024-3094.'*\n"
                "- *'What block rules should I write for rogue IPs?'*\n"
                "- *'Analyze IP 185.112.144.1 for malware signatures.'*"
            )
            suggestions = ["Analyze IP 193.161.193.99", "Explain CVE-2024-3094 vulnerability", "Remediation plan for Ransomware"]
            
        return {
            "response": response,
            "suggestions": suggestions,
            "tokens_used": len(response.split()) + 40
        }

ai_engine = AIEngine()
