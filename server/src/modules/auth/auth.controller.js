import {
  registerUser,
  loginUser,
  setAuthCookie,
  clearAuthCookie,
  formatUser,
} from './auth.service.js';

export const register = async (req, res, next) => {
  try {
    const { user, token } = await registerUser(req.body);
    setAuthCookie(res, token);
    return res.status(201).json({
      status: 'ok',
      user,
      token,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { user, token } = await loginUser(req.body);
    setAuthCookie(res, token);
    return res.status(200).json({
      status: 'ok',
      user,
      token,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    clearAuthCookie(res);
    return res.status(200).json({
      status: 'ok',
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({
      status: 'ok',
      user: formatUser(req.user),
    });
  } catch (error) {
    next(error);
  }
};
