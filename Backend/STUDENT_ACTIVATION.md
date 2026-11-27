# Student signup and email verification

At /signup, enter your name, email, MIS, department and current semester. Any email domain is accepted. Use a unique student email and MIS. The MIS is text and can include leading zeros.

Open the verification email within 15 minutes and choose a password. Completing the link creates the verified student account and enrolls it in matching course offerings. Sign in with email or MIS. To request another signup link, submit the signup form again after one minute.

Configure the sender and provider using Backend/.env.example. Set PUBLIC_APP_URL to the frontend origin and configure SPA fallback for /account/signup. Account creation requires a MongoDB replica set or Atlas.
