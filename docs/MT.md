# Bugs encountered in testing each Feature:

# Feature 1

## Scenario 1.1:

The registration tab is inaccessible if an active guest wishes to register (clicking on the "regisztracio" tab does nothing)

## Scenario 1.2:

if a guest logins into an already existing account he is still logged in as a guest. No progress in transfered.

## Scenario 1.3:

Logout button not working

## Scenario 1.4:

No email was received after 30 minutes. After retry still no email.

## Other points:

Server does not check for unique username.
At account creation there are no password requirements( 'test123' worked). At password reset ('Profilom') there are password requirements.

---

# Feature 2: 

Skipped as per instructions

---

# Feature 3:

No subscription-only lessons were found and everything seems to be unlocked. (Issue reported)

## Other points:

Even with 2 shields in my possession clicking on 'vasarlas' for 'Streak Pajzs' opens a pop up stating: 'Maximum 3 pajzsod lehet egyszerre!'

---

# Feature 4:

Stopwatch never started ticking.

## Other points:

Everything else in working order

Even XP which doesn't work on the Quizes (further info in Feature 6)

---

# Feature 6:

## Scenario 6.1:

Once the "Fill in the Blanks" quiz question is answered there is no XP being awarded dynamically.

Once the "Fill in the Blanks" quiz is done there is no XP awarded

## Scenario 6.3:

Once the TRUE/FALSE quiz is finished the "kerdes counter" keeps going up overflowing to '11/10 '. Looking back at other quizes same issue applies

## Other points:

While stated in the scenario given "

**WHEN** the user submits the correct choice
**THEN** the system should validate, update the score, and display the detailed explanation text block "

When the correct answer is picked no such explanation pops up.


```graph TD
    A[Start: New Feature/Bug Fix] --> B(Create Branch from develop)
    B --> C[Push Feature Branch to GitHub]
    C --> D[Create PR: Feature --> develop]
    D --> E[Sonar Scans / Automated Tests Run]
    E --> F[Junior Dev tests on develop.neolix.studio]
    F --> G[Merge PR into develop]
    G --> H[Create PR: develop --> main]
    H --> I[Merge PR into main to Deploy to Prod]
    ```
    