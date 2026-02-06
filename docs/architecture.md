# System Architecture Diagram

flowchart

    A[Chrome extension<br>(UI & Merchant Detection)]
    B[Backend API<br>Node.js + Express(recommended)]
    C[MongoDB<br>Card + User Data]

    A <-- API Calls --> B
    B <--  Queries  --> C