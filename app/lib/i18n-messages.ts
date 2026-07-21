const sharedKo = {
  language: '언어', logout: '로그아웃', login: '로그인', signup: '가입하기',
  profile: '프로필', labMap: '랩 지도', openLabMap: '랩 지도 열기',
  update: '업데이트', feed: '피드', mission: '미션', calendar: '캘린더',
  project: '프로젝트', team: '팀', mainNavigation: '주요 메뉴',
};
const sharedVi = {
  language: 'Ngôn ngữ', logout: 'Đăng xuất', login: 'Đăng nhập', signup: 'Đăng ký',
  profile: 'Hồ sơ', labMap: 'Bản đồ lab', openLabMap: 'Mở bản đồ lab',
  update: 'Cập nhật', feed: 'Bảng tin', mission: 'Nhiệm vụ', calendar: 'Lịch',
  project: 'Dự án', team: 'Nhóm', mainNavigation: 'Điều hướng chính',
};
const sharedEn = {
  language: 'Language', logout: 'Log out', login: 'Log in', signup: 'Sign up',
  profile: 'Profile', labMap: 'Lab map', openLabMap: 'Open lab map',
  update: 'Update', feed: 'Feed', mission: 'Mission', calendar: 'Calendar',
  project: 'Project', team: 'Team', mainNavigation: 'Main navigation',
};

const authKo = {
  email: '이메일', password: '비밀번호', passwordConfirmation: '비밀번호 확인',
  name: '이름', role: '소속 · 연구 분야', welcomeBack: '다시 만나요 👋',
  welcomeDescription: '랩 멤버들의 오늘을 확인해 보세요.',
  labTodayTitle: '연구실의 오늘을\n가까이에서.',
  labTodayDescription: '오늘의 진행을 남기고 서로의 성장을 함께 보세요.',
  invalidCredentials: '이메일 또는 비밀번호를 확인해 주세요.', loggingIn: '로그인 중...',
  noAccount: '아직 계정이 없나요?', joinYourLab: '연구실의\n오늘에 합류해요.',
  joinDescription: '계정을 만들고 오늘의 연구 기록을 랩 멤버들과 공유하세요.',
  createAccount: '계정 만들기', memberInfo: '연구실 멤버 정보를 입력해 주세요.',
  creatingAccount: '계정 만드는 중...', signupAndStart: '가입하고 시작하기',
  alreadyAccount: '이미 계정이 있나요?', passwordMismatch: '비밀번호가 서로 달라요.',
};
const authVi = {
  email: 'Email', password: 'Mật khẩu', passwordConfirmation: 'Xác nhận mật khẩu',
  name: 'Họ tên', role: 'Đơn vị · Lĩnh vực nghiên cứu', welcomeBack: 'Chào mừng trở lại 👋',
  welcomeDescription: 'Hãy xem hôm nay các thành viên trong lab đang làm gì.',
  labTodayTitle: 'Hôm nay của phòng lab,\nngay bên bạn.',
  labTodayDescription: 'Ghi lại tiến độ hôm nay và cùng theo dõi sự trưởng thành của nhau.',
  invalidCredentials: 'Vui lòng kiểm tra lại email hoặc mật khẩu.', loggingIn: 'Đang đăng nhập...',
  noAccount: 'Bạn chưa có tài khoản?', joinYourLab: 'Tham gia vào\nhôm nay của lab.',
  joinDescription: 'Tạo tài khoản và chia sẻ nhật ký nghiên cứu hôm nay với các thành viên.',
  createAccount: 'Tạo tài khoản', memberInfo: 'Vui lòng nhập thông tin thành viên phòng lab.',
  creatingAccount: 'Đang tạo tài khoản...', signupAndStart: 'Đăng ký và bắt đầu',
  alreadyAccount: 'Bạn đã có tài khoản?', passwordMismatch: 'Hai mật khẩu không giống nhau.',
};
const authEn = {
  email: 'Email', password: 'Password', passwordConfirmation: 'Confirm password',
  name: 'Name', role: 'Affiliation · Research field', welcomeBack: 'Welcome back 👋',
  welcomeDescription: 'See what your lab members are working on today.',
  labTodayTitle: 'Your lab today,\nup close.',
  labTodayDescription: 'Record today’s progress and grow together.',
  invalidCredentials: 'Please check your email or password.', loggingIn: 'Logging in...',
  noAccount: 'Don’t have an account yet?', joinYourLab: 'Join your lab’s\nday.',
  joinDescription: 'Create an account and share today’s research log with your lab.',
  createAccount: 'Create account', memberInfo: 'Enter your lab member information.',
  creatingAccount: 'Creating account...', signupAndStart: 'Sign up and start',
  alreadyAccount: 'Already have an account?', passwordMismatch: 'The passwords do not match.',
};
const onboardingKo = { welcomeOsLab: 'OS Lab에 온 걸 환영해', ready: '준비됐어?', preparing: '준비 중...', startLabTour: '랩 투어 시작' };
const onboardingVi = { welcomeOsLab: 'Chào mừng bạn đến với OS Lab', ready: 'Sẵn sàng chưa?', preparing: 'Đang chuẩn bị...', startLabTour: 'Bắt đầu tham quan lab' };
const onboardingEn = { welcomeOsLab: 'Welcome to OS Lab', ready: 'Ready?', preparing: 'Getting ready...', startLabTour: 'Start lab tour' };

export const messages = {
  ko: { ...sharedKo, ...authKo, ...onboardingKo },
  vi: { ...sharedVi, ...authVi, ...onboardingVi },
  en: { ...sharedEn, ...authEn, ...onboardingEn },
} as const;
