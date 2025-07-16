const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    const user = req.user;

    console.log("🔐 Checking permission:", requiredPermission);
    console.log("👤 User Role:", user?.role);
    console.log("📜 User Permissions:", user?.permissions);

    if (user?.role === 'admin') {
      console.log("✅ Bypassing permissions (admin)");
      return next();
    }

    if (
      user?.role === 'staff' &&
      Array.isArray(user.permissions) &&
      user.permissions.includes(requiredPermission)
    ) {
      console.log("✅ Permission granted (staff)");
      return next();
    }

    console.log("❌ Permission denied");
    return res.status(403).json({ message: "Permission denied" });
  };
};

export { checkPermission };
