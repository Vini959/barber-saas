import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!adminAuth || !adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin not configured" },
        { status: 500 }
      );
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const callerUid = decoded.uid;

    const userDoc = await adminDb.collection("users").doc(callerUid).get();
    const userData = userDoc.data();
    const role = userData?.role;
    const shopId = userData?.shopId;

    const body = await req.json();
    const { email, password, displayName, shopId: bodyShopId, pixKey, schedule } = body;

    if (!email || !password || !displayName || !bodyShopId) {
      return NextResponse.json(
        { error: "Missing email, password, displayName or shopId" },
        { status: 400 }
      );
    }

    const isPlatformAdmin = role === "platform_admin";
    const isShopAdmin = role === "shop_admin" && shopId === bodyShopId;

    if (!isPlatformAdmin && !isShopAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const newUser = await adminAuth.createUser({
      email,
      password,
      displayName,
    });

    await adminDb.collection("users").doc(newUser.uid).set({
      email,
      name: displayName,
      role: "barber",
      shopId: bodyShopId,
      createdAt: new Date().toISOString(),
    });

    const barberData: Record<string, unknown> = {
      userId: newUser.uid,
      shopId: bodyShopId,
      displayName,
      email,
      createdAt: new Date().toISOString(),
    };
    if (pixKey && typeof pixKey === "string") {
      barberData.pixKey = pixKey.trim();
    }
    if (schedule && typeof schedule === "object" && !Array.isArray(schedule)) {
      barberData.schedule = schedule;
    }
    const barberRef = await adminDb.collection("barbers").add(barberData);
    console.log("Created barber", barberRef.id, "for user", newUser.uid);

    return NextResponse.json({ success: true, uid: newUser.uid });
  } catch (err) {
    console.error("Create barber error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
