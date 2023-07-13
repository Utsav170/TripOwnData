function formatTime(time) {
    const hour = parseInt(time);
    const period = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${formattedHour} ${period}`;
}
  
module.exports = {
    formatTime
};