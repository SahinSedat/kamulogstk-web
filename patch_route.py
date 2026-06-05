import re

with open('/Users/sedatsahin/Desktop/KamulogWebYonetim/board_route.ts', 'r') as f:
    content = f.read()

# Add bcrypt import
if 'bcryptjs' not in content:
    content = 'import bcrypt from "bcryptjs";\n' + content

# Sync Logic for POST
sync_logic = """
    // --- OTO-SENKRONİZASYON (USER & MEMBER) ---
    if (phone || email) {
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : firstName;

      let userId = null;
      const existingUser = await prisma.user.findFirst({
        where: { OR: [ ...(phone ? [{ phone }] : []), ...(email ? [{ email }] : []) ] }
      });
      
      if (existingUser) {
        userId = existingUser.id;
      } else {
        const dummyPassword = await bcrypt.hash(Math.random().toString(36).slice(-10), 10);
        try {
          const newUser = await prisma.user.create({
            data: {
              phone: phone || undefined,
              email: email || undefined,
              password: dummyPassword,
              name, firstName, lastName, role: "USER", isVerified: false
            }
          });
          userId = newUser.id;
        } catch(e) { console.error("Board sync user error", e); }
      }

      const existingMember = await prisma.member.findFirst({
        where: { stkId: stk.id, OR: [ ...(phone ? [{ phone }] : []), ...(email ? [{ email }] : []), ...(tcKimlik ? [{ tcKimlik }] : []) ] }
      });
      
      if (existingMember) {
        if (existingMember.status !== 'ACTIVE' || !existingMember.userId) {
          await prisma.member.update({
            where: { id: existingMember.id },
            data: { status: 'ACTIVE', userId: userId || existingMember.userId }
          });
        }
      } else {
        try {
          await prisma.member.create({
            data: {
              stkId: stk.id, userId: userId, name: firstName, surname: lastName,
              phone: phone || "0000000000", email: email || "no-email@kamulog.com", tcKimlik: tcKimlik || null, status: 'ACTIVE', category: 'ASIL'
            }
          });
        } catch(e) { console.error("Board sync member error", e); }
      }
    }
    // ------------------------------------------
"""

# Insert right after `updatedAt: new Date(), }, });` inside POST
content = content.replace('updatedAt: new Date(),\n      },\n    });\n', 'updatedAt: new Date(),\n      },\n    });\n' + sync_logic)

with open('/Users/sedatsahin/Desktop/KamulogWebYonetim/board_route.ts', 'w') as f:
    f.write(content)
