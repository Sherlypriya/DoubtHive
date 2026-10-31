const User = require('../models/User');
const { escapeHtml, buildHtmlTemplate, sendMail } = require('./emailService');

const getClientUrl = () => (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');

/**
 * Resolves admin recipient emails from ADMIN_EMAIL env var or admin accounts in DB
 */
async function getAdminEmails() {
  const emails = new Set();

  if (process.env.ADMIN_EMAIL) {
    const configured = process.env.ADMIN_EMAIL.split(',').map((e) => e.trim().toLowerCase());
    configured.forEach((e) => {
      if (e) emails.add(e);
    });
  }

  // Also query active admin users from the database
  try {
    const admins = await User.find({ role: 'admin' }).select('email');
    admins.forEach((a) => {
      if (a.email) emails.add(a.email.toLowerCase());
    });
  } catch (err) {
    console.error('[EMAIL] Failed to fetch admin emails from DB:', err.message);
  }

  return [...emails];
}

/**
 * A. Student → Faculty Notification
 * Triggered when a new doubt is posted. Identifies relevant faculty by department/subject.
 * Falls back to notifying the platform administrator if no matching faculty member exists.
 */
async function notifyFacultyNewDoubt({ question, student }) {
  try {
    if (!question) return;

    const clientUrl = getClientUrl();
    const doubtUrl = `${clientUrl}/questions/${question._id}`;
    const studentName = student?.name || 'A student';
    const descPreview = (question.description || '').replace(/\s+/g, ' ').slice(0, 200);

    // Find faculty in the same department or assigned to the same subject
    const facultyQuery = {
      role: 'faculty',
      $or: [
        { department: question.department },
        { subjects: question.subject },
      ],
    };

    // If the question author is a faculty member, exclude them from recipient list
    if (student?._id) {
      facultyQuery._id = { $ne: student._id };
    }

    const matchingFaculty = await User.find(facultyQuery).select('name email department subjects');

    if (matchingFaculty.length > 0) {
      // Send notification to each relevant faculty member
      for (const faculty of matchingFaculty) {
        const title = `New Academic Doubt in ${question.department}`;
        const contentHtml = `
          <div class="badge-pill">Subject: ${escapeHtml(question.subject)}</div>
          <p>Hello <strong>${escapeHtml(faculty.name)}</strong>,</p>
          <p><strong>${escapeHtml(studentName)}</strong> posted a new doubt in your department:</p>
          <div class="card">
            <h3 style="margin-top:0; color:#F59E0B; font-size:16px;">${escapeHtml(question.title)}</h3>
            <p style="margin-bottom:0; font-size:14px; color:#CBD5E1;">${escapeHtml(descPreview)}${question.description?.length > 200 ? '…' : ''}</p>
          </div>
          <p style="font-size:13px; color:#94A3B8;">Answering doubts helps students quickly and earns you reputation and faculty badges on the leaderboard.</p>
        `;

        const plainText = `Hello ${faculty.name},\n\n${studentName} posted a new doubt in ${question.subject} (${question.department}):\n\n"${question.title}"\n\nPreview: ${descPreview}\n\nView and answer on DoubtHive: ${doubtUrl}\n`;

        await sendMail({
          to: faculty.email,
          subject: `[DoubtHive] New Doubt in ${question.subject}: ${question.title}`,
          html: buildHtmlTemplate({
            title,
            preheader: `${studentName} asked: "${question.title}"`,
            contentHtml,
            ctaText: 'View & Answer Doubt',
            ctaUrl: doubtUrl,
          }),
          text: plainText,
        });
      }
    } else {
      // Fallback: If no faculty is assigned to this department or subject, alert the admin
      const adminEmails = await getAdminEmails();
      if (adminEmails.length > 0) {
        for (const adminEmail of adminEmails) {
          const title = `Unassigned Doubt in ${question.department}`;
          const contentHtml = `
            <div class="badge-pill">No Faculty Assigned</div>
            <p>A new student doubt was posted in <strong>${escapeHtml(question.department)}</strong> (Subject: <em>${escapeHtml(question.subject)}</em>), but no faculty member is currently assigned to this department or subject.</p>
            <div class="card">
              <h3 style="margin-top:0; color:#F59E0B; font-size:16px;">${escapeHtml(question.title)}</h3>
              <p style="margin-bottom:0; font-size:14px; color:#CBD5E1;">Author: <strong>${escapeHtml(studentName)}</strong></p>
            </div>
            <p style="font-size:13px; color:#94A3B8;">Please review this question or assign faculty coverage for ${escapeHtml(question.department)}.</p>
          `;

          const plainText = `Admin Alert: A new doubt was posted in ${question.department} with no assigned faculty.\n\nTitle: ${question.title}\nAuthor: ${studentName}\nLink: ${doubtUrl}\n`;

          await sendMail({
            to: adminEmail,
            subject: `[DoubtHive Alert] Unassigned Doubt in ${question.department}: ${question.title}`,
            html: buildHtmlTemplate({
              title,
              preheader: `No faculty assigned for doubt: "${question.title}"`,
              contentHtml,
              ctaText: 'Review in DoubtHive',
              ctaUrl: doubtUrl,
            }),
            text: plainText,
          });
        }
      }
    }
  } catch (err) {
    console.error('[EMAIL ERROR] notifyFacultyNewDoubt failed:', err.message);
  }
}

/**
 * B. Answer → Student Notification
 * Triggered when someone answers a student's doubt.
 * Never notifies the answerer themselves if they answered their own question.
 */
async function notifyStudentNewAnswer({ question, answer, answerer }) {
  try {
    if (!question || !answer || !answerer) return;

    // Do not notify the answerer if they are also the question author
    if (question.userId.toString() === answerer._id.toString()) return;

    const student = await User.findById(question.userId).select('name email');
    if (!student || !student.email) return;

    const clientUrl = getClientUrl();
    const answerUrl = `${clientUrl}/questions/${question._id}`;
    const answerPreview = (answer.content || 'Attached media or video').replace(/\s+/g, ' ').slice(0, 180);
    const roleBadge = answer.isFacultyAnswer ? 'Verified Faculty Answer' : 'Peer Answer';

    const title = `New Answer on Your Doubt`;
    const contentHtml = `
      <div class="badge-pill">${roleBadge}</div>
      <p>Hello <strong>${escapeHtml(student.name)}</strong>,</p>
      <p><strong>${escapeHtml(answerer.name)}</strong> (${answer.isFacultyAnswer ? 'Faculty' : 'Student'}) posted an answer to your doubt:</p>
      <div class="card">
        <h3 style="margin-top:0; color:#F59E0B; font-size:15px;">Doubt: "${escapeHtml(question.title)}"</h3>
        <p style="margin-bottom:0; font-size:14px; color:#CBD5E1; font-style:italic;">"${escapeHtml(answerPreview)}${answer.content?.length > 180 ? '…' : ''}"</p>
      </div>
      <p style="font-size:13px; color:#94A3B8;">If this answer resolved your question, remember to accept it to award reputation points and mark your doubt as resolved!</p>
    `;

    const plainText = `Hello ${student.name},\n\n${answerer.name} answered your doubt "${question.title}":\n\n"${answerPreview}"\n\nView the answer: ${answerUrl}\n`;

    await sendMail({
      to: student.email,
      subject: `[DoubtHive] New Answer on "${question.title}"`,
      html: buildHtmlTemplate({
        title,
        preheader: `${answerer.name} answered your doubt "${question.title}"`,
        contentHtml,
        ctaText: 'View Answer & Accept',
        ctaUrl: answerUrl,
      }),
      text: plainText,
    });
  } catch (err) {
    console.error('[EMAIL ERROR] notifyStudentNewAnswer failed:', err.message);
  }
}

/**
 * C. Accepted Answer → Answerer Notification
 * Triggered when a student marks an answer as accepted.
 */
async function notifyAnswererAccepted({ question, answer, student }) {
  try {
    if (!question || !answer) return;

    const answerAuthor = await User.findById(answer.userId).select('name email');
    if (!answerAuthor || !answerAuthor.email) return;

    const clientUrl = getClientUrl();
    const doubtUrl = `${clientUrl}/questions/${question._id}`;
    const studentName = student?.name || 'The question owner';

    const title = `🎉 Your Answer Was Accepted!`;
    const contentHtml = `
      <div class="badge-pill">+10 Reputation Points</div>
      <p>Congratulations <strong>${escapeHtml(answerAuthor.name)}</strong>,</p>
      <p><strong>${escapeHtml(studentName)}</strong> marked your answer as the official accepted solution to their doubt:</p>
      <div class="card">
        <h3 style="margin-top:0; color:#F59E0B; font-size:16px;">"${escapeHtml(question.title)}"</h3>
        <p style="margin-bottom:0; font-size:13px; color:#10B981; font-weight:600;">✔ Marked as Solution · Status: Resolved</p>
      </div>
      <p style="font-size:14px; color:#E2E8F0;">You earned <strong>+10 XP</strong> toward your level and leaderboard rank. Keep up the great work helping the community!</p>
    `;

    const plainText = `Congratulations ${answerAuthor.name}!\n\n${studentName} accepted your answer to "${question.title}".\nYou earned +10 reputation points!\n\nView the resolved question: ${doubtUrl}\n`;

    await sendMail({
      to: answerAuthor.email,
      subject: `🎉 [DoubtHive] Your answer was accepted! (+10 XP)`,
      html: buildHtmlTemplate({
        title,
        preheader: `Your answer to "${question.title}" was accepted! (+10 XP)`,
        contentHtml,
        ctaText: 'View Resolved Doubt',
        ctaUrl: doubtUrl,
      }),
      text: plainText,
    });
  } catch (err) {
    console.error('[EMAIL ERROR] notifyAnswererAccepted failed:', err.message);
  }
}

/**
 * D. Admin Notification: New User Registration
 */
async function notifyAdminNewUser({ user }) {
  try {
    if (!user) return;
    const adminEmails = await getAdminEmails();
    if (!adminEmails.length) return;

    const clientUrl = getClientUrl();
    const adminUsersUrl = `${clientUrl}/admin`;

    for (const adminEmail of adminEmails) {
      // Don't send notification to the user themselves if an admin registered
      if (adminEmail === user.email.toLowerCase()) continue;

      const title = `New User Registered: ${user.name}`;
      const contentHtml = `
        <div class="badge-pill">Role: ${escapeHtml(user.role.toUpperCase())}</div>
        <p>A new user account was registered on DoubtHive:</p>
        <div class="card">
          <p style="margin:4px 0;"><strong>Name:</strong> ${escapeHtml(user.name)}</p>
          <p style="margin:4px 0;"><strong>Email:</strong> ${escapeHtml(user.email)}</p>
          <p style="margin:4px 0;"><strong>Role:</strong> ${escapeHtml(user.role)}</p>
          <p style="margin:4px 0;"><strong>Department:</strong> ${escapeHtml(user.department || 'Not specified')}</p>
          ${user.semester ? `<p style="margin:4px 0;"><strong>Semester:</strong> ${user.semester}</p>` : ''}
        </div>
      `;

      const plainText = `Admin Alert: New user registered.\nName: ${user.name}\nEmail: ${user.email}\nRole: ${user.role}\nDepartment: ${user.department}\n`;

      await sendMail({
        to: adminEmail,
        subject: `[DoubtHive Admin] New ${user.role} Registered: ${user.name}`,
        html: buildHtmlTemplate({
          title,
          preheader: `New ${user.role} registered: ${user.name} (${user.email})`,
          contentHtml,
          ctaText: 'View Admin Dashboard',
          ctaUrl: adminUsersUrl,
        }),
        text: plainText,
      });
    }
  } catch (err) {
    console.error('[EMAIL ERROR] notifyAdminNewUser failed:', err.message);
  }
}

/**
 * E. Welcome Email to Newly Registered User
 */
async function notifyWelcomeUser({ user }) {
  try {
    if (!user || !user.email) return;

    const clientUrl = getClientUrl();
    const title = `Welcome to DoubtHive, ${user.name}! 🐝`;
    const contentHtml = `
      <div class="badge-pill">Welcome to the Hive</div>
      <p>Hello <strong>${escapeHtml(user.name)}</strong>,</p>
      <p>Thank you for joining <strong>DoubtHive</strong> — the gamified doubt resolution platform for students and faculty.</p>
      <div class="card">
        <h4 style="margin-top:0; color:#F59E0B;">Here's how to get started:</h4>
        <ul style="padding-left:18px; margin-bottom:0; font-size:14px; color:#CBD5E1;">
          <li><strong>Ask Doubts:</strong> Stuck on an assignment or lecture? Post your questions and get answers.</li>
          <li><strong>Help Peers:</strong> Provide answers, earn upvotes (+2 XP), and receive accepted answers (+10 XP).</li>
          <li><strong>Level Up:</strong> Progress through 9 player ranks and unlock badges.</li>
          <li><strong>Redeem Perks:</strong> Use your reputation to claim campus rewards.</li>
        </ul>
      </div>
      <p style="font-size:13px; color:#94A3B8;">We're excited to have you in the community. Happy learning!</p>
    `;

    const plainText = `Welcome to DoubtHive, ${user.name}!\n\nPost academic doubts, answer questions, earn reputation points, and climb the leaderboard.\n\nExplore doubts now: ${clientUrl}/explore\n`;

    await sendMail({
      to: user.email,
      subject: `Welcome to DoubtHive! 🐝`,
      html: buildHtmlTemplate({
        title,
        preheader: `Welcome to DoubtHive! Ask, answer, learn, and earn reputation.`,
        contentHtml,
        ctaText: 'Explore the Quest Board',
        ctaUrl: `${clientUrl}/explore`,
      }),
      text: plainText,
    });
  } catch (err) {
    console.error('[EMAIL ERROR] notifyWelcomeUser failed:', err.message);
  }
}

/**
 * F. Admin Moderation Event Notification
 */
async function notifyAdminModerationEvent({ action, itemType, title: itemTitle, details = '', actor }) {
  try {
    const adminEmails = await getAdminEmails();
    if (!adminEmails.length) return;

    const clientUrl = getClientUrl();
    const adminUrl = `${clientUrl}/admin`;

    for (const adminEmail of adminEmails) {
      const emailTitle = `Moderation Alert: ${action}`;
      const contentHtml = `
        <div class="badge-pill">Moderation Action: ${escapeHtml(action)}</div>
        <p>A moderation action was performed on DoubtHive by <strong>${escapeHtml(actor?.name || 'Administrator')}</strong>:</p>
        <div class="card">
          <p style="margin:4px 0;"><strong>Action:</strong> ${escapeHtml(action)}</p>
          <p style="margin:4px 0;"><strong>Item Type:</strong> ${escapeHtml(itemType)}</p>
          <p style="margin:4px 0;"><strong>Target:</strong> ${escapeHtml(itemTitle)}</p>
          ${details ? `<p style="margin:4px 0;"><strong>Details:</strong> ${escapeHtml(details)}</p>` : ''}
        </div>
      `;

      const plainText = `Moderation Alert: ${action} on ${itemType}: "${itemTitle}" by ${actor?.name || 'Admin'}.\n`;

      await sendMail({
        to: adminEmail,
        subject: `[DoubtHive Moderation] ${action}: ${itemType}`,
        html: buildHtmlTemplate({
          title: emailTitle,
          preheader: `Moderation event: ${action} on ${itemType}`,
          contentHtml,
          ctaText: 'Open Admin Dashboard',
          ctaUrl: adminUrl,
        }),
        text: plainText,
      });
    }
  } catch (err) {
    console.error('[EMAIL ERROR] notifyAdminModerationEvent failed:', err.message);
  }
}

module.exports = {
  notifyFacultyNewDoubt,
  notifyStudentNewAnswer,
  notifyAnswererAccepted,
  notifyAdminNewUser,
  notifyWelcomeUser,
  notifyAdminModerationEvent,
  getAdminEmails,
};
